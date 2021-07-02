# std:
import time
import json
import hashlib
import hmac
import urllib.parse

# pip-int:
import dotsi

# pip-ext:
# n/a

# loc:
import utils


class SignatureInvalidError(Exception):
    pass


ms_now = lambda: int(time.time() * 1000)
ms_delta_toDays = lambda msCount: msCount / (1000 * 60 * 60 * 24.0)
# ^-- 1000 ms/sec, 60 sec/min, 60min/hr, 24hr/day.


def buildHasher(saltPrefix="", digestmod=hashlib.sha512):
    "Returns a dotsi.Dict() w/ .hash, .check etc. functions."

    def hash(msg, salt):
        keyBytes = (saltPrefix + salt).encode("utf8")
        msgBytes = msg.encode("utf8")
        return hmac.HMAC(key=keyBytes, msg=msgBytes, digestmod=digestmod).hexdigest()

    def check(expectedHash, msg, salt, digestmod=hashlib.sha512):
        return expectedHash == hash(msg, salt)

    def signDetached(data, msTs, secret):
        tData = {"data": data, "msTs": msTs}
        tDataStr = json.dumps(tData)
        # print("tDataStr = ", tDataStr);
        return hash(tDataStr, secret)

    def checkDetachedSign(sig, data, msTs, secret):
        return sig == signDetached(data, msTs, secret)

    def signWrap(data, secret):
        "Signs json-stringifiable `data` using `secret`. Produces wrapped string."
        msTs = ms_now()
        sig = signDetached(data, msTs, secret)
        signWrappedData = {"data": data, "msTs": msTs, "sig": sig}
        signWrappedDataStr = json.dumps(signWrappedData)
        signWrappedDataStrQ = utils.quote(signWrappedDataStr)
        # print("signWrappedDataStr = ", signWrappedDataStr);
        return signWrappedDataStrQ
        #       ^----
        #           |
        #           V

    def _signUnwrap(signWrappedDataStrQ, secret, maxExpiryInDays=30):
        # Note: maxExpiryInDays=30 can be changed w/ each call.
        "Unwraps and reads signWrappedDataStr, using secret."
        signWrappedDataStr = utils.unquote(signWrappedDataStrQ)
        signWrappedData = json.loads(signWrappedDataStr)
        # ^-- Failure would raise json.decoder.JSONDecodeError
        # Unwrapping:
        data = signWrappedData["data"]
        # ^-- Failure would raise KeyError
        msTs = signWrappedData["msTs"]
        sig = signWrappedData["sig"]
        # Validate signature:
        assert checkDetachedSign(sig, data, msTs, secret)
        # ^-- Failure would raise AssertionError
        # ==> SIGNATURE FORMAT OK.
        msSinceSigned = ms_now() - msTs
        # print("msSinceSigned = ", msSinceSigned);
        daysSinceSigned = ms_delta_toDays(msSinceSigned)
        # print("daysSinceSigned = ", daysSinceSigned);
        assert daysSinceSigned <= maxExpiryInDays
        # ^-- Failure would raise AssertionError
        # ==> SIGNATURE EXPIRY OK.
        return dotsi.fy(data) if type(data) is dict else data

    def signUnwrap(signWrappedDataStr, secret, maxExpiryInDays=30):
        # Note: maxExpiryInDays=30 can be changed w/ each call.
        try:
            return _signUnwrap(signWrappedDataStr, secret, maxExpiryInDays)
        except (json.decoder.JSONDecodeError, KeyError, AssertionError) as e:
            raise SignatureInvalidError("Supplied signature is invalid.")

    # Export:
    return dotsi.fy(
        {
            "hash": hash,
            "check": check,
            "signDetached": "signDetached",
            "signWrap": signWrap,
            "_signUnwrap": _signUnwrap,
            "signUnwrap": signUnwrap,
            "SignatureInvalidError": SignatureInvalidError,
            # ^-- Exported the error class, for access via built dotsiDict.
        }
    )


defaultHasher = buildHasher()
# Default hasher.


def test_quick():
    h = buildHasher()
    msg = "This is a test message."
    salt = "sample_salt"

    hashedMsg = h.hash(msg, salt)
    assert h.check(hashedMsg, msg, salt)
    assert not h.check(hashedMsg + "--edit", msg, salt)

    secret = "super_secret"
    # It's just another salt.
    signedMsg = h.signWrap(msg, secret)
    assert h.signUnwrap(signedMsg, secret) == msg

    badSignDetected = False
    # Not yet detected.
    try:
        h.signUnwrap(signedMsg + "--edit", secret)
    except SignatureInvalidError as e:
        badSignDetected = True
    assert badSignDetected

    badSignDetected = False
    # Again, not yet detected.
    time.sleep(0.01)
    # ^-- Letting time pass between creating and reading signed data.
    try:
        h.signUnwrap(signedMsg, secret, maxExpiryInDays=0)
    # ^-- Then checking if sign has expired, expect to be expired.
    except SignatureInvalidError as e:
        badSignDetected = True
    assert badSignDetected
    # TODO: Write more tests.


if __name__ == "__main__":
    test_quick()
    print("Tests ran successfully.")
