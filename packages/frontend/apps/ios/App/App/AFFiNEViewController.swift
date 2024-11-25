import UIKit
import Capacitor

class AFFiNEViewController: CAPBridgeViewController {

  override func viewDidLoad() {
    super.viewDidLoad()
    // disable by default, enable manually when there is a "back" button in page-header
    webView?.allowsBackForwardNavigationGestures = false
  }
  
  override func capacitorDidLoad() {
    bridge?.registerPluginInstance(CookiePlugin())
    bridge?.registerPluginInstance(HashcashPlugin())
    bridge?.registerPluginInstance(NavigationGesturePlugin())
  }
}
