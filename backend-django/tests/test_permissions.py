from apps.shared.permissions import CanAccessMovements


class _User:
    def __init__(self, role, is_authenticated=True):
        self.role = role
        self.is_authenticated = is_authenticated


class _Request:
    def __init__(self, method, user):
        self.method = method
        self.user = user


def test_contabilidad_can_read_movements_but_not_write():
    perm = CanAccessMovements()
    user = _User("CONTABILIDAD")
    assert perm.has_permission(_Request("GET", user), None) is True
    assert perm.has_permission(_Request("POST", user), None) is False


def test_admin_and_ti_can_write_movements():
    perm = CanAccessMovements()
    assert perm.has_permission(_Request("POST", _User("ADMIN")), None) is True
    assert perm.has_permission(_Request("POST", _User("TI")), None) is True


def test_auditor_cannot_access_movements():
    perm = CanAccessMovements()
    user = _User("AUDITOR")
    assert perm.has_permission(_Request("GET", user), None) is False
    assert perm.has_permission(_Request("POST", user), None) is False
