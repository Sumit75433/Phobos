#[tokio::main(flavor = "current_thread")]
async fn main() {
    let interface = std::env::var("PHOBOS_INTERFACE_ID")
        .map(phobos_descriptors::InterfaceId::new)
        .expect("PHOBOS_INTERFACE_ID is required by the remote-exec-server door life");
    if let Err(error) = phobos_tool_door_runtime::run_spawned_interface_life(
        phobos_tool_door_runtime::owned_tool_door_interface_life(
            phobos_tool_door_runtime::ToolDoorOwner {
                worker_environment_kind: phobos_descriptors::WorkerEnvironmentKindId::new(
                    "remote_exec_server",
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
        eprintln!("phobos-remote-exec-server-tool-door-life failed: {error}");
        std::process::exit(1);
    }
}
