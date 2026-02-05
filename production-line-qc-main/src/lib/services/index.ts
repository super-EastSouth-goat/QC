// Job Management Service
export { JobService, jobService } from './jobService'
export type {
  CreateJobParams,
  UpdateJobParams,
  JobPollingResult
} from './jobService'

// Photo Upload Service
export { PhotoService, photoService } from './photoService'
export type {
  UploadPhotoParams,
  UploadProgress,
  PhotoUploadResult
} from './photoService'

// Edge API Integration Service
export { EdgeApiService, edgeApiService } from './edgeApiService'
export type {
  EdgeAPIRequest,
  EdgeAPIResponse,
  RetryOptions
} from './edgeApiService'

// Profile Service (existing)
export { ProfileService, profileService } from './profileService'