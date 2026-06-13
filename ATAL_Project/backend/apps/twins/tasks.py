from celery import shared_task


@shared_task(name="apps.twins.update_state")
def update_twin_state(asset_id: str):
    from apps.twins.engine import TwinStateEngine
    TwinStateEngine.update(asset_id)
