"""
海康威视 MVS 相机封装，供 QC Edge 拉流与状态查询。
不依赖 station_app，DLL 路径可配置。
"""
import ctypes
import threading
import time
from abc import ABC, abstractmethod
from typing import Optional

import cv2
import numpy as np

# 默认 MVS 运行时 DLL（与 station_app 一致，不修改源程序设置则使用此路径）
DEFAULT_DLL_PATH = r"C:\Program Files (x86)\Common Files\MVS\Runtime\Win64_x64\MvCameraControl.dll"

# SDK 常量
MV_GIGE_DEVICE = 1
MV_USB_DEVICE = 2
MV_OK = 0x00000000
PixelType_Gvsp_Mono8 = 0x01080001
PixelType_Gvsp_BayerRG8 = 0x01080009


class MV_CC_DEVICE_INFO_LIST(ctypes.Structure):
    _fields_ = [
        ("nDeviceNum", ctypes.c_uint),
        ("pDeviceInfo", ctypes.POINTER(ctypes.c_void_p) * 256),
    ]


class MV_FRAME_OUT_INFO_EX(ctypes.Structure):
    _fields_ = [
        ("nWidth", ctypes.c_ushort),
        ("nHeight", ctypes.c_ushort),
        ("enPixelType", ctypes.c_int),
        ("nFrameNum", ctypes.c_uint),
        ("nDevTimeStampHigh", ctypes.c_uint),
        ("nDevTimeStampLow", ctypes.c_uint),
        ("nReserved0", ctypes.c_uint),
        ("nHostTimeStamp", ctypes.c_longlong),
        ("nFrameLen", ctypes.c_uint),
        ("nSecondCount", ctypes.c_uint),
        ("nCycleCount", ctypes.c_uint),
        ("nCycleOffset", ctypes.c_uint),
        ("fGain", ctypes.c_float),
        ("fExposureTime", ctypes.c_float),
        ("nAverageBrightness", ctypes.c_uint),
        ("nRed", ctypes.c_uint),
        ("nGreen", ctypes.c_uint),
        ("nBlue", ctypes.c_uint),
        ("nFrameCounter", ctypes.c_uint),
        ("nTriggerIndex", ctypes.c_uint),
        ("nInput", ctypes.c_uint),
        ("nOutput", ctypes.c_uint),
        ("nReserved", ctypes.c_uint * 10),
    ]


class BaseCamera(ABC):
    def __init__(self):
        self.is_running = False
        self.lock = threading.Lock()
        self.last_frame = None

    @abstractmethod
    def start(self) -> None:
        pass

    @abstractmethod
    def stop(self) -> None:
        pass

    @abstractmethod
    def get_frame(self) -> Optional[bytes]:
        pass

    def check_io_status(self) -> bool:
        return False

    def capture_photo(self) -> Optional[np.ndarray]:
        with self.lock:
            if self.last_frame is not None:
                return self.last_frame.copy()
        return None

    def set_brightness(self, value: float) -> None:
        pass

    def trigger_simulation(self) -> None:
        pass


class HikCameraDll(BaseCamera):
    """通过 MvCameraControl.dll 连接海康威视 MVS 相机。"""

    def __init__(self, dll_path: str = DEFAULT_DLL_PATH, serial_number: Optional[str] = None):
        super().__init__()
        self.dll_path = dll_path
        self.serial_number = serial_number
        self.handle = None
        self.MvCam = None
        self.buf_size = 20 * 1024 * 1024
        self.p_data_buf = (ctypes.c_ubyte * self.buf_size)()
        self.digital_gain = 1.0
        self.io_simulated_flag = False
        self._load_dll()

    def _load_dll(self) -> None:
        try:
            self.MvCam = ctypes.cdll.LoadLibrary(self.dll_path)
            self._setup_argtypes()
        except OSError as e:
            print(f"[ERROR] Failed to load MVS DLL: {e}")

    def _setup_argtypes(self) -> None:
        self.MvCam.MV_CC_EnumDevices.argtypes = [
            ctypes.c_uint,
            ctypes.POINTER(MV_CC_DEVICE_INFO_LIST),
        ]
        self.MvCam.MV_CC_CreateHandle.argtypes = [
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.c_void_p,
        ]
        self.MvCam.MV_CC_OpenDevice.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_ushort]
        self.MvCam.MV_CC_StartGrabbing.argtypes = [ctypes.c_void_p]
        self.MvCam.MV_CC_GetOneFrameTimeout.argtypes = [
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_ubyte),
            ctypes.c_uint,
            ctypes.POINTER(MV_FRAME_OUT_INFO_EX),
            ctypes.c_int,
        ]
        self.MvCam.MV_CC_CloseDevice.argtypes = [ctypes.c_void_p]
        self.MvCam.MV_CC_DestroyHandle.argtypes = [ctypes.c_void_p]

    def start(self) -> None:
        if not self.MvCam:
            return
        device_list = MV_CC_DEVICE_INFO_LIST()
        ret = self.MvCam.MV_CC_EnumDevices(
            MV_GIGE_DEVICE | MV_USB_DEVICE,
            ctypes.byref(device_list),
        )
        if ret != MV_OK or device_list.nDeviceNum == 0:
            print(f"[ERROR] No MVS devices found or enum failed: {hex(ret)}")
            return
        st_device_info = device_list.pDeviceInfo[0]
        self.handle = ctypes.c_void_p()
        ret = self.MvCam.MV_CC_CreateHandle(ctypes.byref(self.handle), st_device_info)
        if ret != MV_OK:
            print(f"[ERROR] Create handle failed: {hex(ret)}")
            return
        ret = self.MvCam.MV_CC_OpenDevice(self.handle, 1, 0)
        if ret != MV_OK:
            print(f"[ERROR] Open device failed: {hex(ret)}")
            return
        ret = self.MvCam.MV_CC_StartGrabbing(self.handle)
        if ret != MV_OK:
            print(f"[ERROR] Start grabbing failed: {hex(ret)}")
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._update_frame, daemon=True)
        self.thread.start()

    def _update_frame(self) -> None:
        frame_info = MV_FRAME_OUT_INFO_EX()
        fail_count = 0
        while self.is_running and self.handle and self.MvCam:
            ret = self.MvCam.MV_CC_GetOneFrameTimeout(
                self.handle,
                self.p_data_buf,
                self.buf_size,
                ctypes.byref(frame_info),
                1000,
            )
            if ret == MV_OK:
                fail_count = 0
                width = frame_info.nWidth
                height = frame_info.nHeight
                pixel_type = frame_info.enPixelType
                data_len = frame_info.nFrameLen
                full_buf = np.ctypeslib.as_array(self.p_data_buf)
                img_data = full_buf[:data_len]
                if pixel_type == PixelType_Gvsp_Mono8:
                    img = img_data.reshape((height, width))
                elif pixel_type == PixelType_Gvsp_BayerRG8:
                    img = img_data.reshape((height, width))
                    img = cv2.cvtColor(img, cv2.COLOR_BayerRG2GRAY)
                else:
                    try:
                        img = img_data.reshape((height, width))
                    except ValueError:
                        time.sleep(0.01)
                        continue
                if img.size == 0:
                    time.sleep(0.01)
                    continue
                if img.max() < 100:
                    img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
                img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                if self.digital_gain != 1.0:
                    img_bgr = cv2.convertScaleAbs(img_bgr, alpha=self.digital_gain, beta=0)
                with self.lock:
                    self.last_frame = img_bgr.copy()
            else:
                fail_count += 1
                if fail_count % 100 == 0:
                    print(f"[WARN] HikDLL GetFrame failed: {hex(ret)}")
                time.sleep(0.01)

    def stop(self) -> None:
        self.is_running = False
        if self.handle and self.MvCam:
            self.MvCam.MV_CC_CloseDevice(self.handle)
            self.MvCam.MV_CC_DestroyHandle(self.handle)
            self.handle = None

    def get_frame(self) -> Optional[bytes]:
        with self.lock:
            if self.last_frame is None:
                return None
            ret, jpeg = cv2.imencode(".jpg", self.last_frame)
            return jpeg.tobytes() if ret else None

    def check_io_status(self) -> bool:
        if self.io_simulated_flag:
            self.io_simulated_flag = False
            return True
        return False

    def capture_photo(self) -> Optional[np.ndarray]:
        with self.lock:
            if self.last_frame is not None:
                return self.last_frame.copy()
        return None

    def set_brightness(self, value: float) -> None:
        self.digital_gain = max(0.1, min(20.0, value))

    def trigger_simulation(self) -> None:
        self.io_simulated_flag = True


def get_camera_service(dll_path: Optional[str] = None) -> BaseCamera:
    path = dll_path or DEFAULT_DLL_PATH
    return HikCameraDll(dll_path=path)


# 全局单例，供 main 使用
camera_service = get_camera_service()
