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

// ---------- Lanbeam pet bridge (localhost) ----------
//
// The Lanbeam macOS Agent publishes a loopback-only HTTP listener whose port
// is written to ~/Library/Application Support/Lanbeam/pet-bridge.json.
// Through it the pet can hand itself off to the paired iPad and learn when
// it has been sent back.

fn bridge_port() -> Option<u16> {
    let home = std::env::var("HOME").ok()?;
    let path = format!("{home}/Library/Application Support/Lanbeam/pet-bridge.json");
    let data = std::fs::read_to_string(path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&data).ok()?;
    u16::try_from(value.get("port")?.as_u64()?).ok()
}

fn bridge_request(method: &str, path: &str, body: Option<&str>) -> Result<String, String> {
    use std::io::{Read, Write};
    use std::time::Duration;

    let port = bridge_port().ok_or("pet bridge unavailable")?;
    let mut stream = std::net::TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([127, 0, 0, 1], port)),
        Duration::from_secs(2),
    )
    .map_err(|e| e.to_string())?;
    stream.set_read_timeout(Some(Duration::from_secs(3))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(3))).ok();

    let body = body.unwrap_or("");
    let request = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).map_err(|e| e.to_string())?;

    let mut response = String::new();
    stream.read_to_string(&mut response).map_err(|e| e.to_string())?;
    if !response.starts_with("HTTP/1.1 200") {
        return Err(format!(
            "bridge status: {}",
            response.lines().next().unwrap_or("<empty>")
        ));
    }
    response
        .split_once("\r\n\r\n")
        .map(|(_, b)| b.to_string())
        .ok_or_else(|| "malformed bridge response".into())
}

#[tauri::command]
async fn pet_bridge_state() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| bridge_request("GET", "/local/pet/state", None))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn pet_bridge_handoff(to: String, entry_edge: String) -> Result<String, String> {
    if !matches!(to.as_str(), "mac" | "ios") || !matches!(entry_edge.as_str(), "left" | "right") {
        return Err("invalid handoff arguments".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let body = format!(r#"{{"to":"{to}","entryEdge":"{entry_edge}"}}"#);
        bridge_request("POST", "/local/pet/handoff", Some(&body))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn pet_bridge_settings(
    size: f64,
    speed: f64,
    activity: f64,
    stunts: f64,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let body =
            format!(r#"{{"size":{size},"speed":{speed},"activity":{activity},"stunts":{stunts}}}"#);
        bridge_request("POST", "/local/pet/settings", Some(&body))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_windows,
            pet_bridge_state,
            pet_bridge_handoff,
            pet_bridge_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
