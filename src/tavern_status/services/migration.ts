// ── 存档迁移服务 ──
// Schema version 变更时自动迁移旧存档结构

export function migrateSave(raw: any, targetVersion = 1): any {
  try {
    const current = raw;
    if (current?.meta) {
      current.meta.schemaVersion = targetVersion;
    }
    return current;
  } catch (e) {
    console.error('[primordia] 存档迁移失败', e);
    return null;
  }
}
