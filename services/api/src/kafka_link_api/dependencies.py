from typing import Annotated

from fastapi import Depends, Request

from .runtime import ApiRuntime


def get_runtime(request: Request) -> ApiRuntime:
    return request.app.state.runtime


RuntimeDep = Annotated[ApiRuntime, Depends(get_runtime)]
