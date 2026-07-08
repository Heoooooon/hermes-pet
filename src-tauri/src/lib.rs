use serde::Serialize;

/// A normal (layer-0) on-screen window, in logical screen points with the
/// origin at the top-left of the primary display — multiply by the monitor
/// scale factor to get physical pixels.
#[derive(Serialize, Clone)]
pub struct DesktopWindow {
    pub id: i64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
fn list_windows() -> Vec<DesktopWindow> {
    #[cfg(target_os = "macos")]
    {
        macos::list_windows()
    }
    #[cfg(not(target_os = "macos"))]
    {
        Vec::new()
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::DesktopWindow;
    use core_foundation::array::CFArray;
    use core_foundation::base::{CFType, TCFType};
    use core_foundation::dictionary::{CFDictionary, CFDictionaryRef};
    use core_foundation::number::CFNumber;
    use core_foundation::string::CFString;
    use core_graphics::geometry::CGRect;
    use core_graphics::window::{
        copy_window_info, kCGWindowListExcludeDesktopElements, kCGWindowListOptionOnScreenOnly,
    };
    use std::ffi::c_void;

    pub fn list_windows() -> Vec<DesktopWindow> {
        let own_pid = std::process::id() as i64;
        let mut out = Vec::new();
        let list: CFArray<*const c_void> = match copy_window_info(
            kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
            0,
        ) {
            Some(list) => list,
            None => return out,
        };

        for item in list.iter() {
            let dict: CFDictionary<CFString, CFType> =
                unsafe { CFDictionary::wrap_under_get_rule(*item as CFDictionaryRef) };

            let num = |key: &str| -> Option<i64> {
                dict.find(CFString::new(key))
                    .and_then(|v| v.downcast::<CFNumber>())
                    .and_then(|n| n.to_i64())
            };

            if num("kCGWindowLayer").unwrap_or(-1) != 0 {
                continue;
            }
            if num("kCGWindowOwnerPID").unwrap_or(0) == own_pid {
                continue;
            }
            if num("kCGWindowAlpha").unwrap_or(1) == 0 {
                continue;
            }
            let Some(id) = num("kCGWindowNumber") else {
                continue;
            };
            let Some(bounds) = dict
                .find(CFString::new("kCGWindowBounds"))
                .and_then(|v| v.downcast::<CFDictionary>())
                .and_then(|d| CGRect::from_dict_representation(&d))
            else {
                continue;
            };

            // Ignore tiny utility windows and menu-bar popovers.
            if bounds.size.width < 160.0 || bounds.size.height < 90.0 {
                continue;
            }

            out.push(DesktopWindow {
                id,
                x: bounds.origin.x,
                y: bounds.origin.y,
                width: bounds.size.width,
                height: bounds.size.height,
            });
        }
        out
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_windows])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
