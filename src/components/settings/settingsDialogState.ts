import { create } from 'zustand'
import { useSettings } from '../../services/settings.js'

/** 设置弹窗的分组：通用设置 / 数据管理 */
export type SettingsSection = 'general' | 'data'

/** 设置弹窗：侧边栏底部、没有 API Key 时的操作与 401 提示都可以打开；section 为打开时选中的分组 */
export const useSettingsDialog = create(() => ({
  open: false,
  section: 'general' as SettingsSection,
}))

export const openSettings = (section: SettingsSection) =>
  useSettingsDialog.setState({ open: true, section })

export const closeSettings = () => useSettingsDialog.setState({ open: false })

export const useApiKeySetup = create(() => ({ open: false }))

export const closeApiKeySetup = () => useApiKeySetup.setState({ open: false })

/** 缺少凭据时直接打开录入界面。 */
export const ensureApiKey = () => {
  if (useSettings.getState().hasApiKey) {
    return true
  }
  useApiKeySetup.setState({ open: true })
  return false
}
