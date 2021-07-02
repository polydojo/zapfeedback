# std:
# n/a

# pip-int:
import dotsi

# pip-ext:
# n/a

# loc:
import bu
from constants import K
import utils
import userMod

############################################################
# Anti-CSRF related:                                       #
############################################################


def genXCsrfToken(userId):
    return bu.hasher.signWrap(
        data=userId,
        secret=K.ANTI_CSRF_SECRET,
    )


def validateXCsrfToken(xCsrfToken, userId):
    try:
        # print("xCsrfToken = ", repr(xCsrfToken));
        # print(bu.getCookie("userId"));
        unwrappedUserId = bu.hasher.signUnwrap(
            xCsrfToken,
            secret=K.ANTI_CSRF_SECRET,
            # ^-- Though we use `bu.hasher`, we specify overriding secret.
            maxExpiryInDays=K.REMEMBER_ME_DAY_COUNT,
            # ^-- This talks about signature-expiry, not cookie expiry.
            # ^-- Note: Can set to 0 or 0.0001 to see XSRF validation being enforced.
        )
    except bu.hasher.SignatureInvalidError as e:
        return bu.abort(
            "1. X-CSRF validation failed. Please log out and then log back in."
        )
    # ==> No unwrapping error.
    if unwrappedUserId != userId:
        return bu.abort(
            "2. X-CSRF validation failed. Please log out and then log back in."
        )
    # ==> Unwrapped data is as expected.
    return True


############################################################
# Success response:                                        #
############################################################


def sendAuthSuccessResponse(user, rememberMe=False):
    maxAge = None
    # Assumption
    if rememberMe:  # Correction
        maxAge = K.REMEMBER_ME_DAY_COUNT * 24 * 60 * 60
        # N days * 24 hrs * 60 mins * 60 sec => N days in sec
    signWrapped = bu.setCookie(
        name="userId",
        data=user._id,
        secret=K.AUTH_COOKIE_SECRET,
        maxAge=maxAge,
    )
    xCsrfToken = genXCsrfToken(user._id)
    bu.setUnsignedCookie(
        name="xCsrfToken",
        value=xCsrfToken,
        httpOnly=False,
        maxAge=maxAge,
    )
    return {"user": userMod.snipUser(user)}


############################################################
# Getting current user etc.                                #
############################################################


def getSesh(strict=True, validateCsrf=None, req=None):
    "Get sesh (session-like) object with current 'user' property."
    req = req or bu.request
    # Defaults to (global) bu.request.
    if validateCsrf is None:
        validateCsrf = bool(req.method != "GET")
        # Default behavior: false for GET, else true.
    # Check the 'userId' cookie:
    userId = bu.getCookie(
        "userId",
        strict=strict,
        secret=K.AUTH_COOKIE_SECRET,
        req=req,
    )
    if not userId:
        assert not strict
        return dotsi.fy({"user": None})
    # ==> Cookie found, signature valid.
    assert userId
    if validateCsrf:
        # Ref: https://laravel.com/docs/5.8/csrf#csrf-x-csrf-token
        xCsrfToken = req.headers.get("X-Csrf-Token")
        assert validateXCsrfToken(xCsrfToken, userId)
        # ==> CSRF TOKEN IS VALID.
    # ==> CSRF PREVENTED, if applicable.
    user = userMod.getUser(userId)
    assert user and user.isVerified
    # User shouldn't be able to log-in if not .isVerified. Asserting here.
    if user.isDeactivated:
        # XXX:Note: Below 'log out' should force CLI logout.
        return bu.abort(
            "ACCOUNT DEACTIVATED\n\n"
            + "Your account has been deactivated by your admin."
            + "You shall now proceed to log out."  # +
        )
    # ==> User exists, is verified, non-deactivated.
    return dotsi.fy({"user": user})


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
