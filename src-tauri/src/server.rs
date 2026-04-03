use serde::{Deserialize, Serialize};
use std::io::Read;
use std::sync::mpsc;
use std::thread;
use tiny_http::{Header, Response, Server};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub state: String,
    pub data: Option<EventData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventData {
    pub summary: Option<String>,
}

pub fn start_server(sender: mpsc::Sender<PetEvent>) {
    thread::spawn(move || {
        let server = match Server::http("127.0.0.1:23334") {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to start HTTP server on 23334: {}", e);
                return;
            }
        };

        for mut request in server.incoming_requests() {
            if request.method().as_str() == "POST" && request.url() == "/event" {
                let mut body = String::new();
                if request.as_reader().take(4096).read_to_string(&mut body).is_ok() {
                    if let Ok(event) = serde_json::from_str::<PetEvent>(&body) {
                        let _ = sender.send(event);
                    }
                }
                let cors = Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap();
                let ct = Header::from_bytes("Content-Type", "application/json").unwrap();
                let response = Response::from_string("{\"ok\":true}")
                    .with_header(cors)
                    .with_header(ct);
                let _ = request.respond(response);
            } else {
                let _ = request.respond(Response::from_string("not found").with_status_code(404));
            }
        }
    });
}
