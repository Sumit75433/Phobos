use std::sync::Arc;

use phobos_interface_transport::{InterfaceLifeFuture, InterfaceLiftFn};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let life: InterfaceLiftFn = Arc::new(|ctx| {
        Box::pin(async move {
            if ctx.resolved_interface_descriptor()?.interface_driver_config.as_ref()
                .is_some_and(|config| config.private_config.contains_key("application_consent_authority")) {
                return Err("selected Home consent authority uses an unsupported contract; initialize a fresh Home".into());
            }
            phobos_world_pyecho_life_runtime::run_descriptor_activation_life(
                ctx,
                phobos_interface_activation_app_server_transport::TRANSPORT_REF,
                phobos_interface_activation_app_server_transport::activation_start,
            ).await
        }) as InterfaceLifeFuture
    });
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(life).await {
        eprintln!("phobos-app-server-activation-life failed: {error}");
        std::process::exit(1);
    }
}
