import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

async function isAdmin(userId: string): Promise<boolean> {
  const privs = await query<any[]>("SELECT 1 FROM privilege WHERE user_id=$1 AND rightstr='administrator'", [userId]);
  return privs && privs.length > 0;
}

const SETTING_DEFAULTS: Record<string, string> = {
  OJ_NAME: 'Online Judge',
  OJ_REGISTER: 'false',
  OJ_NEED_LOGIN: 'false',
  OJ_PUBLIC_STATUS: 'true',
  OJ_SIM: 'true',
  OJ_MAIL: 'false',
  OJ_MATHJAX: 'true',
  OJ_ACE_EDITOR: 'true',
  OJ_VCODE: 'false',
  OJ_LONG_LOGIN: 'true',
  OJ_AUTO_SHOW_OFF: 'false',
  OJ_OI_MODE: 'false',
  OJ_CONTEST_TOTAL_100: 'false',
  OJ_CE_PENALTY: 'false',
  OJ_APPENDCODE: 'false',
  OJ_BLOCKLY: 'false',
  OJ_TEST_RUN: 'false',
  OJ_DOWNLOAD: 'false',
  OJ_SHARE_CODE: 'false',
  OJ_REMOTE_JUDGE: 'false',
  OJ_NICK_IMMUTABLE: 'false',
  OJ_NOIP_HINT: 'false',
  OJ_FREE_PRACTICE: 'false',
  OJ_LIMIT_TO_1_IP: 'false',
};

const SETTING_LABELS: Record<string, string> = {
  OJ_NAME: 'OJ 名称',
  OJ_REGISTER: '允许注册（已被禁用）',
  OJ_NEED_LOGIN: '需要登录才能浏览',
  OJ_PUBLIC_STATUS: '公开提交状态',
  OJ_SIM: '代码相似度检测',
  OJ_MAIL: '站内信',
  OJ_MATHJAX: '支持 LaTeX 数学公式',
  OJ_ACE_EDITOR: '代码编辑器高亮',
  OJ_VCODE: '验证码',
  OJ_LONG_LOGIN: '长期登录',
  OJ_AUTO_SHOW_OFF: '自动隐藏已显示内容',
  OJ_OI_MODE: 'OI 模式（按分数排名）',
  OJ_CONTEST_TOTAL_100: 'OI 模式每题满分 100',
  OJ_CE_PENALTY: 'CE 计入罚时',
  OJ_APPENDCODE: '允许附加代码',
  OJ_BLOCKLY: '图形化编程',
  OJ_TEST_RUN: '允许测试运行',
  OJ_DOWNLOAD: '允许下载数据',
  OJ_SHARE_CODE: '允许分享代码',
  OJ_REMOTE_JUDGE: '远程判题',
  OJ_NICK_IMMUTABLE: '昵称不可修改',
  OJ_NOIP_HINT: 'NOIP 提示',
  OJ_FREE_PRACTICE: '自由练习模式',
  OJ_LIMIT_TO_1_IP: '限制单 IP 登录',
};

// Ensure the setting table exists
async function ensureSettingTable() {
  await query(
    "CREATE TABLE IF NOT EXISTS setting (key_name VARCHAR(100) PRIMARY KEY, value TEXT, comment VARCHAR(255) DEFAULT '')"
  );
}

export async function GET() {
  try {
    await ensureSettingTable();
    const rows = await query<any[]>("SELECT key_name, value FROM setting");
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key_name] = row.value;
    }
    // Merge defaults
    for (const [k, v] of Object.entries(SETTING_DEFAULTS)) {
      if (!(k in settings)) settings[k] = v;
    }
    return NextResponse.json({ settings, labels: SETTING_LABELS, defaults: SETTING_DEFAULTS });
  } catch (error) {
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = getUserFromCookies(request)?.userId;
  if (!userId || !(await isAdmin(userId))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    await ensureSettingTable();
    const body = await request.json();
    const { settings } = body;
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: '无效参数' }, { status: 400 });
    }

    let saved = 0;
    for (const [key, value] of Object.entries(settings)) {
      const strVal = String(value ?? '');
      await query(
        "INSERT INTO setting(key_name, value) VALUES($1, $2) ON CONFLICT (key_name) DO UPDATE SET value=$3",
        [key, strVal, strVal]
      );
      saved++;
    }

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
