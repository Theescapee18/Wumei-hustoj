import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 判题系统统计API
export async function GET(request: NextRequest) {
  try {
    // 从judge_config读取最大并发数
    const config = await query<any[]>(
      `SELECT config_key, config_value FROM judge_config`
    );

    const maxConcurrent = parseInt(
      config.find(c => c.config_key === 'MAX_CONCURRENT')?.config_value || 2
    );

    // 查询队列统计
    const stats = await query<any[]>(
      `SELECT 
        COUNT(CASE WHEN status = 0 THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 1 THEN 1 END) as running_count,
        COUNT(CASE WHEN status = 2 THEN 1 END) as completed_count,
        AVG(CASE WHEN status = 2 THEN
          EXTRACT(EPOCH FROM (end_time - start_time))
        END) as avg_judge_time,
        AVG(CASE WHEN status = 0 THEN
          EXTRACT(EPOCH FROM (NOW() - create_time))
        END) as avg_waiting_time
       FROM judge_queue
       WHERE create_time >= NOW() - INTERVAL '1 hour'`
    );

    const statData = stats[0] || {};

    return NextResponse.json({
      current_concurrent: parseInt(statData.running_count || 0),
      max_concurrent: maxConcurrent,
      waiting_count: parseInt(statData.waiting_count || 0),
      running_count: parseInt(statData.running_count || 0),
      completed_count: parseInt(statData.completed_count || 0),
      avg_judge_time: parseFloat(statData.avg_judge_time || 0),
      avg_waiting_time: parseFloat(statData.avg_waiting_time || 0),
      system_status: parseInt(statData.running_count || 0) < maxConcurrent ? '正常' : '排队',
      load_percentage: Math.floor(
        (parseInt(statData.running_count || 0) / maxConcurrent) * 100
      )
    });
  } catch (error) {
    console.error('Get judge stats error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}