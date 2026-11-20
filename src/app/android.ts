import { App as AndroidApp } from '@capacitor/app'
import { dismissTopModal } from '../components/base/Modal.js'
import { closeSearchPanel, useSearchPanel } from '../components/search/searchPanelState.js'
import { closeMobileSider, useMobileSider } from '../components/sider/mobileSiderState.js'
import { bindExternalLinks, isAndroidApp } from '../services/android.js'

export const setupAndroid = () => {
  if (!isAndroidApp) {
    return
  }
  bindExternalLinks()
  void AndroidApp.addListener('backButton', () => {
    if (dismissTopModal()) {
      return
    }
    if (useSearchPanel.getState().entry !== null) {
      closeSearchPanel()
    } else if (useMobileSider.getState().open) {
      closeMobileSider()
    } else if (
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    ) {
      void AndroidApp.minimizeApp()
    }
  })
}
