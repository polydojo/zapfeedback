# std:
import os

# pip-ext:
# n/a

# pip-int:
# n/a

# loc:
# n/a

NoneType = type(None)


class EnvironmentKeyError(KeyError):
    pass


Error = EnvironmentKeyError  # Alias, externally: envi.Error


def readEnvironmentKey(key, default=None):
    # Prelims:
    assert type(key) is str
    assert default is None or type(default) is str

    if key in os.environ:
        return os.environ[key]
    # otherwise ...
    if default or (default == ""):
        return default
    # otherwise ...
    raise EnvironmentKeyError(key)


read = readEnvironmentKey  # Alias, externally: envi.read(.)
