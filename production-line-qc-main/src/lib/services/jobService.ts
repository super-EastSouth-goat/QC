import { createClient } from '../supabase/client'
import type { Database } from '../types/database'

type Job = Database['public']['Tables']['jobs']['Row']
type JobInsert = Database['public']['Tables']['jobs']['Insert']
type JobUpdate = Database['public']['Tables']['jobs']['Update']
type JobEvent = Database['public']['Tables']['job_events']['Insert']

export interface CreateJobParams {
  barcode: string
  station?: string
}

export interface UpdateJobParams {
  id: string
  status?: Job['status']
  result?: Job['result']
  confidence?: number
  detail?: string
}

export interface JobPollingResult {
  job: Job
  isComplete: boolean
  shouldContinuePolling: boolean
}

export class JobService {
  private supabase = createClient()
  private isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
                      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://demo.supabase.co'

  /**
   * 创建新的质检任务
   * 需求: 1.2, 1.5 - 创建唯一Job并绑定用户
   */
  async createJob(params: CreateJobParams): Promise<Job> {
    if (this.isDemoMode) {
      // 演示模式：返回模拟数据
      const mockJob: Job = {
        id: `demo-job-${Date.now()}`,
        user_id: 'demo-user-123',
        barcode: params.barcode,
        station: params.station || '工位A',
        status: 'created',
        result: null,
        confidence: null,
        detail: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Demo mode: Created mock job', mockJob)
      return mockJob
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未认证')
    }

    // 获取用户profile以获取station信息
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('station')
      .eq('id', user.id)
      .single()

    const jobData: JobInsert = {
      user_id: user.id,
      barcode: params.barcode,
      station: params.station || profile?.station || null,
      status: 'created'
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (error) {
      await this.logJobEvent({
        job_id: '', // 无法获取job_id，因为创建失败
        event: 'job_creation_failed',
        detail: { error: error.message, barcode: params.barcode }
      })
      throw new Error(`创建任务失败: ${error.message}`)
    }

    // 记录任务创建事件
    await this.logJobEvent({
      job_id: data.id,
      event: 'job_created',
      detail: { barcode: params.barcode, station: data.station }
    })

    return data
  }

  /**
   * 更新任务状态
   * 需求: 4.1, 4.5 - 状态管理和轮询机制
   */
  async updateJob(params: UpdateJobParams): Promise<Job> {
    if (this.isDemoMode) {
      // 演示模式：返回更新后的模拟数据
      const mockJob: Job = {
        id: params.id,
        user_id: 'demo-user-123',
        barcode: 'DEMO-' + Date.now().toString().slice(-6),
        station: '工位A',
        status: params.status || 'created',
        result: params.result || null,
        confidence: params.confidence || null,
        detail: params.detail || null,
        created_at: new Date(Date.now() - 60000).toISOString(), // 1分钟前
        updated_at: new Date().toISOString()
      }
      
      console.log('Demo mode: Updated mock job', mockJob)
      return mockJob
    }

    const updateData: JobUpdate = {
      id: params.id,
      updated_at: new Date().toISOString()
    }

    if (params.status !== undefined) updateData.status = params.status
    if (params.result !== undefined) updateData.result = params.result
    if (params.confidence !== undefined) updateData.confidence = params.confidence
    if (params.detail !== undefined) updateData.detail = params.detail

    const { data, error } = await this.supabase
      .from('jobs')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      await this.logJobEvent({
        job_id: params.id,
        event: 'job_update_failed',
        detail: { error: error.message, updateData }
      })
      throw new Error(`更新任务失败: ${error.message}`)
    }

    // 记录状态更新事件
    await this.logJobEvent({
      job_id: params.id,
      event: 'job_updated',
      detail: { 
        status: params.status,
        result: params.result,
        confidence: params.confidence
      }
    })

    return data
  }

  /**
   * 获取任务详情
   */
  async getJob(jobId: string): Promise<Job | null> {
    if (this.isDemoMode) {
      // 演示模式：返回模拟任务
      const mockJob: Job = {
        id: jobId,
        user_id: 'demo-user-123',
        barcode: 'DEMO-' + jobId.slice(-6),
        station: '工位A',
        status: 'completed',
        result: Math.random() > 0.3 ? 'PASS' : 'FAIL',
        confidence: Math.random() * 0.4 + 0.6,
        detail: '演示模式分析结果',
        created_at: new Date(Date.now() - 120000).toISOString(), // 2分钟前
        updated_at: new Date().toISOString()
      }
      
      return mockJob
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // 任务不存在
      }
      throw new Error(`获取任务失败: ${error.message}`)
    }

    return data
  }

  /**
   * 轮询任务状态直到完成
   * 需求: 4.1 - 每1-2秒自动轮询一次结果状态
   */
  async pollJobStatus(
    jobId: string, 
    onStatusUpdate?: (job: Job) => void,
    maxDuration: number = 30000 // 30秒超时
  ): Promise<JobPollingResult> {
    const startTime = Date.now()
    const pollInterval = 1500 // 1.5秒间隔

    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const job = await this.getJob(jobId)
          
          if (!job) {
            resolve({
              job: {} as Job,
              isComplete: false,
              shouldContinuePolling: false
            })
            return
          }

          // 通知状态更新
          if (onStatusUpdate) {
            onStatusUpdate(job)
          }

          // 检查是否完成
          const isComplete = ['completed', 'failed', 'timeout'].includes(job.status)
          
          // 检查是否超时
          const hasTimedOut = Date.now() - startTime > maxDuration
          
          if (isComplete || hasTimedOut) {
            if (hasTimedOut && !isComplete) {
              // 更新任务状态为超时
              await this.updateJob({
                id: jobId,
                status: 'timeout'
              })
              
              const updatedJob = await this.getJob(jobId)
              resolve({
                job: updatedJob || job,
                isComplete: true,
                shouldContinuePolling: false
              })
            } else {
              resolve({
                job,
                isComplete,
                shouldContinuePolling: false
              })
            }
          } else {
            // 继续轮询
            setTimeout(poll, pollInterval)
          }
        } catch (error) {
          await this.logJobEvent({
            job_id: jobId,
            event: 'polling_error',
            detail: { error: error instanceof Error ? error.message : String(error) }
          })
          
          // 轮询出错时也要继续，但记录错误
          setTimeout(poll, pollInterval)
        }
      }

      // 开始轮询
      poll()
    })
  }

  /**
   * 获取用户的任务历史
   * 需求: 5.1, 5.2 - 历史记录查看
   */
  async getUserJobs(
    userId?: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
      status?: Job['status']
      result?: Job['result']
    }
  ): Promise<Job[]> {
    if (this.isDemoMode) {
      // 演示模式：生成模拟历史数据
      const mockJobs: Job[] = []
      const statuses: Job['status'][] = ['completed', 'failed', 'processing']
      const results: Job['result'][] = ['PASS', 'FAIL']
      
      for (let i = 0; i < 15; i++) {
        const createdAt = new Date(Date.now() - i * 3600000) // 每小时一个
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const result = status === 'completed' ? results[Math.floor(Math.random() * results.length)] : null
        
        mockJobs.push({
          id: `demo-job-${i}`,
          user_id: 'demo-user-123',
          barcode: `DEMO-${String(i).padStart(6, '0')}`,
          station: '工位A',
          status,
          result,
          confidence: result ? Math.random() * 0.4 + 0.6 : null,
          detail: result ? `演示模式 - ${result === 'PASS' ? '合格' : '不合格'}` : null,
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString()
        })
      }
      
      return mockJobs
    }

    let query = this.supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    // 如果没有指定userId，获取当前用户的任务
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('用户未认证')
      }
      query = query.eq('user_id', user.id)
    } else {
      query = query.eq('user_id', userId)
    }

    // 应用筛选条件
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.result) {
      query = query.eq('result', filters.result)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`获取任务历史失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取统计信息
   * 需求: 5.4 - 统计信息显示
   */
  async getJobStatistics(
    userId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    totalJobs: number
    passCount: number
    failCount: number
    completedCount: number
  }> {
    let query = this.supabase
      .from('jobs')
      .select('status, result')

    // 如果没有指定userId，获取当前用户的统计
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('用户未认证')
      }
      query = query.eq('user_id', user.id)
    } else {
      query = query.eq('user_id', userId)
    }

    // 应用日期筛选
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`获取统计信息失败: ${error.message}`)
    }

    const jobs = data || []
    
    return {
      totalJobs: jobs.length,
      passCount: jobs.filter(job => job.result === 'PASS').length,
      failCount: jobs.filter(job => job.result === 'FAIL').length,
      completedCount: jobs.filter(job => job.status === 'completed').length
    }
  }

  /**
   * 记录任务事件
   */
  async logJobEvent(event: JobEvent): Promise<void> {
    try {
      await this.supabase
        .from('job_events')
        .insert({
          job_id: event.job_id,
          event: event.event,
          detail: event.detail
        })
    } catch (error) {
      // 事件记录失败不应该影响主要功能
      console.error('记录任务事件失败:', error)
    }
  }
}

// 导出单例实例
export const jobService = new JobService()