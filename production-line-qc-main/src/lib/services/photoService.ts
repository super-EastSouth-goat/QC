import { createClient } from '../supabase/client'
import type { Database } from '../types/database'

type Photo = Database['public']['Tables']['photos']['Row']
type PhotoInsert = Database['public']['Tables']['photos']['Insert']

export interface UploadPhotoParams {
  jobId: string
  photoBlob: Blob
  fileName?: string
}

export interface UploadProgress {
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error'
  message?: string
}

export interface PhotoUploadResult {
  photo: Photo
  publicUrl: string
  storageUrl: string
}

export class PhotoService {
  private supabase = createClient()
  private isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
                      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://demo.supabase.co'

  /**
   * 上传照片到 Supabase Storage
   * 需求: 3.1, 3.2 - 文件上传和状态管理
   */
  async uploadPhoto(
    params: UploadPhotoParams,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<PhotoUploadResult> {
    if (this.isDemoMode) {
      // 演示模式：模拟上传过程
      if (onProgress) {
        onProgress({
          progress: 0,
          status: 'uploading',
          message: '开始上传照片...'
        })
      }

      // 模拟上传延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onProgress) {
        onProgress({
          progress: 50,
          status: 'processing',
          message: '照片上传成功，正在处理...'
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      if (onProgress) {
        onProgress({
          progress: 100,
          status: 'completed',
          message: '照片上传完成'
        })
      }

      // 创建模拟照片记录
      const mockPhoto: Photo = {
        id: `demo-photo-${Date.now()}`,
        job_id: params.jobId,
        user_id: 'demo-user-123',
        storage_path: `demo-user-123/${params.jobId}/demo-photo.jpg`,
        file_size: params.photoBlob.size,
        mime_type: params.photoBlob.type,
        created_at: new Date().toISOString()
      }

      // 创建一个临时的 URL 用于预览
      const publicUrl = URL.createObjectURL(params.photoBlob)

      return {
        photo: mockPhoto,
        publicUrl,
        storageUrl: `demo://qc-images/${mockPhoto.storage_path}`
      }
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未认证')
    }

    // 通知开始上传
    if (onProgress) {
      onProgress({
        progress: 0,
        status: 'uploading',
        message: '开始上传照片...'
      })
    }

    try {
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = params.fileName || `photo-${timestamp}.jpg`
      const filePath = `${user.id}/${params.jobId}/${fileName}`

      // 上传到 Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('qc-images')
        .upload(filePath, params.photoBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        if (onProgress) {
          onProgress({
            progress: 0,
            status: 'error',
            message: `上传失败: ${uploadError.message}`
          })
        }
        throw new Error(`照片上传失败: ${uploadError.message}`)
      }

      // 通知上传完成
      if (onProgress) {
        onProgress({
          progress: 50,
          status: 'processing',
          message: '照片上传成功，正在处理...'
        })
      }

      // 获取公共URL
      const { data: urlData } = this.supabase.storage
        .from('qc-images')
        .getPublicUrl(filePath)

      // 记录到数据库
      const photoData: PhotoInsert = {
        job_id: params.jobId,
        user_id: user.id,
        storage_path: filePath,
        file_size: params.photoBlob.size,
        mime_type: params.photoBlob.type
      }

      const { data: photo, error: dbError } = await this.supabase
        .from('photos')
        .insert(photoData)
        .select()
        .single()

      if (dbError) {
        // 如果数据库记录失败，尝试删除已上传的文件
        await this.supabase.storage
          .from('qc-images')
          .remove([filePath])

        if (onProgress) {
          onProgress({
            progress: 0,
            status: 'error',
            message: `数据库记录失败: ${dbError.message}`
          })
        }
        throw new Error(`照片记录失败: ${dbError.message}`)
      }

      // 通知完成
      if (onProgress) {
        onProgress({
          progress: 100,
          status: 'completed',
          message: '照片上传完成'
        })
      }

      return {
        photo,
        publicUrl: urlData.publicUrl,
        storageUrl: `supabase://qc-images/${filePath}`
      }

    } catch (error) {
      if (onProgress) {
        onProgress({
          progress: 0,
          status: 'error',
          message: error instanceof Error ? error.message : '未知错误'
        })
      }
      throw error
    }
  }

  /**
   * 获取照片信息
   */
  async getPhoto(photoId: string): Promise<Photo | null> {
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // 照片不存在
      }
      throw new Error(`获取照片失败: ${error.message}`)
    }

    return data
  }

  /**
   * 根据任务ID获取照片
   */
  async getPhotosByJobId(jobId: string): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`获取任务照片失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取照片的公共URL
   */
  getPhotoPublicUrl(storagePath: string): string {
    const { data } = this.supabase.storage
      .from('qc-images')
      .getPublicUrl(storagePath)

    return data.publicUrl
  }

  /**
   * 获取照片的签名URL（用于私有访问）
   */
  async getPhotoSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('qc-images')
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      throw new Error(`获取照片签名URL失败: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * 删除照片
   */
  async deletePhoto(photoId: string): Promise<void> {
    // 先获取照片信息
    const photo = await this.getPhoto(photoId)
    if (!photo) {
      throw new Error('照片不存在')
    }

    // 从数据库删除记录
    const { error: dbError } = await this.supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      throw new Error(`删除照片记录失败: ${dbError.message}`)
    }

    // 从存储删除文件
    const { error: storageError } = await this.supabase.storage
      .from('qc-images')
      .remove([photo.storage_path])

    if (storageError) {
      // 存储删除失败，但数据库记录已删除，记录警告
      console.warn('存储文件删除失败:', storageError.message)
    }
  }

  /**
   * 批量上传照片（用于多张照片的场景）
   */
  async uploadMultiplePhotos(
    jobId: string,
    photoBlobs: Blob[],
    onProgress?: (overallProgress: number, currentIndex: number, currentProgress: UploadProgress) => void
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = []
    const totalPhotos = photoBlobs.length

    for (let i = 0; i < photoBlobs.length; i++) {
      const photoBlob = photoBlobs[i]
      
      try {
        const result = await this.uploadPhoto(
          {
            jobId,
            photoBlob,
            fileName: `photo-${i + 1}-${Date.now()}.jpg`
          },
          (progress) => {
            if (onProgress) {
              const overallProgress = Math.round(((i + progress.progress / 100) / totalPhotos) * 100)
              onProgress(overallProgress, i, progress)
            }
          }
        )
        
        results.push(result)
      } catch (error) {
        // 单张照片上传失败，继续上传其他照片
        console.error(`照片 ${i + 1} 上传失败:`, error)
        if (onProgress) {
          onProgress(
            Math.round(((i + 1) / totalPhotos) * 100),
            i,
            {
              progress: 0,
              status: 'error',
              message: error instanceof Error ? error.message : '上传失败'
            }
          )
        }
      }
    }

    return results
  }

  /**
   * 压缩图片（可选功能，用于减少上传大小）
   */
  async compressImage(
    file: File | Blob,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // 设置画布尺寸
        canvas.width = width
        canvas.height = height

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height)

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('图片压缩失败'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('图片加载失败'))
      
      // 创建图片URL
      const url = URL.createObjectURL(file)
      img.src = url
    })
  }
}

// 导出单例实例
export const photoService = new PhotoService()