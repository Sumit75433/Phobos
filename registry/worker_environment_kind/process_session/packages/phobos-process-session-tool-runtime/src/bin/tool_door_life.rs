#[tokio::main(flavor = "current_thread")]
async fn main() {
    let interface = std::env::var("PHOBOS_INTERFACE_ID")
        .map(phobos_descriptors::InterfaceId::new)
        .expect("PHOBOS_INTERFACE_ID is required by the process-session door life");
    if let Err(error) = phobos_process_session_tool_runtime::run_spawned_interface_life(
        phobos_process_session_tool_runtime::owned_tool_door_interface_life(
            phobos_process_session_tool_runtime::ToolDoorOwner {
                worker_environment_kind: phobos_descriptors::WorkerEnvironmentKindId::new(
                    "process_session",
                ),
                door_interface: interface,
                max_in_flight: 16,
                private_read_max_bytes: 4096,
                root_slot_transform: None,
            },
        )
        .expect("owned tool-door configuration is valid"),
    )
    .await
    {
        eprintln!("phobos-process-session-tool-door-life failed: {error}");
        std::process::exit(1);
    }
}
