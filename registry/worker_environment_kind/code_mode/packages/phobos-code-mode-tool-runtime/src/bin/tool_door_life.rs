#[path = "../owner_handoff.rs"]
mod owner_handoff;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let interface = std::env::var("PHOBOS_INTERFACE_ID")
        .map(phobos_descriptors::InterfaceId::new)
        .expect("PHOBOS_INTERFACE_ID is required by the code-mode door life");
    let handoff = owner_handoff::OwnerHandoff::new();
    let door = phobos_tool_door_runtime::owned_tool_door_interface_life_with_output(
        phobos_tool_door_runtime::ToolDoorOwner {
            worker_environment_kind: phobos_descriptors::WorkerEnvironmentKindId::new("code_mode"),
            door_interface: interface,
            max_in_flight: 16,
            private_read_max_bytes: 4096,
            root_slot_transform: None,
        },
        phobos_code_mode_room::decode_code_mode_door_artifact,
        Some(handoff.callback()),
    )
    .expect("owned tool-door configuration is valid");
    let life: phobos_tool_door_runtime::InterfaceLiftFn = std::sync::Arc::new(move |ctx| {
        let door = door.clone();
        let handoff = handoff.clone();
        Box::pin(async move {
            let cancellation = ctx.owner_cancel();
            let door = door(ctx.clone());
            let observer = handoff.observe(ctx);
            tokio::pin!(door, observer);
            tokio::select! {
                result = &mut door => { cancellation.cancel(); let observed = observer.await; result.and(observed) },
                result = &mut observer => { cancellation.cancel(); let detached = door.await; result.and(detached) },
            }
        })
    });
    if let Err(error) = phobos_tool_door_runtime::run_spawned_interface_life(life).await {
        eprintln!("phobos-code-mode-tool-door-life failed: {error}");
        std::process::exit(1);
    }
}
