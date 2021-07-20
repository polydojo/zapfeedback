# std:
import time
import secrets
import random

# pip-int:
import dotsi

# pip-ext:
# n/a

# loc:
import bu
from appDef import app
from constants import K
import userMod
import magitokMod
import utils
import auth
import emailer


@app.post("/userCon/setupFirstUser")
def post_userCon_setupFirstUser():
    email, fname, lname = bu.unpack_jdata("email fname lname")
    userCount = userMod.getUserCount()
    if userCount >= 1:
        return bu.abort("Setup already completed. Please visit /login to log in.")
    # ==> No users yet.
    user = userMod.buildUser(
        email=email,
        fname=fname,
        lname=lname,
        isPrime=True,
        isVerified=True,
        isAdmin=True,
    )
    userMod.insertUser(user)
    return auth.sendAuthSuccessResponse(user)


def sendMagicLink(user, token):
    emailer.send(
        toList=[user.email],
        subject="ZapFeedback Login Link",
        body=f"""Hi {user.fname},\n\nHere's your login link:\n
        {K.SITE_URL}/userCon/verifyMagiLogin/{user._id}/{token}""",
        subtype="plain",
    )


@app.post("/userCon/startMagiLogin")
def post_userCon_startMagiLogin():
    email = bu.unpack_jdata("email")[0]
    user = userMod.getUserByEmail(email)
    SUCCESS = {"status": "success"}
    NOT_FOUND = SUCCESS  # <-- Mitigates user enumeration
    if not user:
        time.sleep(2 + random.random() * 3)
        print(f"No such user: {email}")
        return NOT_FOUND
    # ==> User found
    print(f"User found: {email}")
    token = secrets.token_urlsafe()
    magitok = magitokMod.buildMagitok(user._id, token)
    magitokMod.upsertMagitok(magitok)
    sendMagicLink(user, token)
    return SUCCESS


@app.get("/userCon/verifyMagiLogin/<magitokId>/<token>")
def get_userCon_verifyMagiLogin(magitokId, token):
    magitok = magitokMod.getMagitok(magitokId)
    REDO = " Please visit /login to restart the log in process."
    ASK_ADMIN = " Please contact your admin for help."
    # ^-- Leading space in both above constants.
    if not magitok:
        return bu.abort("No such login link." + REDO)
    # ==> Magitok Found
    expiresAt = magitok.issuedAt + utils.minutes_to_ms(15)
    if expiresAt < utils.now():
        # Note: Not deleting magitok here, to aid w/ testing.
        return bu.abort("Login link expired." + REDO)
    # ==> Magitok Not Yet Expired
    if not utils.checkPw(token, magitok.hToken):
        return bu.abort("Incorrect login link." + REDO)
    # ==> Token Matches
    user = userMod.getUser({"_id": magitokId})
    assert user
    if not user.isVerified:
        return bu.abort("Unconfirmed account." + ASK_ADMIN)
    # ==> User is verified.
    if user.isDeactivated:
        return bu.abort("Account deactivated." + ASK_ADMIN)
    # ==> Login successful!
    magitokMod.deleteMagitok(magitok)  # <-- Delete OTP
    auth.sendAuthSuccessResponse(user)  # <-- Sets cookies.
    # TODO: Check if bu.redirect() retains set cookies.
    dashUrl = f"{K.SITE_URL}/front/dash.html"
    return f"""
        <h2>Redirecting ...</h2>
        <p>Please <a href="{dashUrl}">click here</a> if you aren't redirected soon.</p>
        <script>window.location.href = "{dashUrl}";</script>
    """


@app.post("/userCon/detectLogin")
@auth.seshful
def post_userCon_detectLogin(sesh):
    assert bu.get_jdata() == {}
    return {
        "user": userMod.snipUser(sesh.user),
    }
    # IMPORTANT: Do NOT use auth.sendAuthSuccessResponse().
    #   That's only for when a password-based success is
    #   obtained: login/join. Here, a login is
    #   merely being detected. No fresh login has occured.
    #   Note: auth.sendAuthSuccessResponse() sends the
    #   XCSRF token downstream. We don't wanna do that here.


@app.post("/userCon/logout")
def post_userCon_logout():
    bu.clearCookie("userId")
    bu.clearCookie("xCsrfToken")
    return {"status": "success"}


@app.post("/userCon/fetchUserList")
@auth.seshful
def post_userCon_fetchUserList(sesh):
    userList = userMod.getUserList()
    # print("userList = ", userList);
    snippedUserList = utils.map(userList, userMod.snipUser)
    # print("snippedUserList = ", snippedUserList);
    return {"userList": snippedUserList}


def genInviteLink(invitee, veriCode):
    inviteLinkQs = utils.qs.dumps(
        {
            "inviteeId": invitee._id,
            "veriCode": veriCode,
        }
    )
    return "%s/front/join.html?%s" % (K.SITE_URL, inviteLinkQs)


def sendInviteEmail(invitee, veriCode):
    emailer.send(
        toList=[invitee.email],
        subject="ZapFeedback Invitation Link",
        body=genInviteLink(invitee, veriCode),
        subtype="plain",
    )


@app.post("/userCon/inviteUser")
@auth.seshful
def post_userCon_inviteUser(sesh):
    assert sesh.user.isAdmin
    jdata = bu.get_jdata(
        ensure="""
        invitee_fname, invitee_lname, invitee_email,
        invitee_isAdmin,
    """
    )
    inviter = sesh.user
    invitee = userMod.getUserByEmail(jdata.invitee_email)
    newVeriCode = userMod.genVeriCode()
    if not invitee:
        # ==> Invitee doesn't already exists. (fresh invite)
        invitee = userMod.buildUser(
            email=jdata.invitee_email,
            fname=jdata.invitee_fname,
            lname=jdata.invitee_lname,
            inviterId=inviter._id,
            veriCode=newVeriCode,
            isAdmin=jdata.invitee_isAdmin,
        )
    else:
        # ==> Invitee already exists. (re-invite)
        if invitee.isVerified:
            return bu.abort(
                "That email address is already associated with a confirmed user."
            )
        # ==> __NOT__ already verified.
        invitee.update(
            {
                "fname": jdata.invitee_fname,
                # ^-- Allows re-inviting w/ updated name.
                "lname": jdata.invitee_lname,
                "inviterId": inviter._id,
                # ^-- We update to the latest inviter's id.
                "hVeriCode": utils.hashPw(newVeriCode),
                # ^-- On reinvite, new veriCode is gen'd, prev expires.
                "isAdmin": jdata.invitee_isAdmin,
            }
        )
        assert invitee.email == jdata.invitee_email
        # ^-- fname/lname/inviterId/hVeriCode can change, but not email.
    # ==> `invitee` object is now available.
    userMod.upsertUser(invitee)
    if emailer.checkSendingEnabled():
        return_inviteLink = None
        sendInviteEmail(invitee, newVeriCode)
    else:
        return_inviteLink = genInviteLink(invitee, newVeriCode)
    return {
        "user": userMod.snipUser(invitee),
        "inviteLink": return_inviteLink,
    }


def getUnverifiedUserByVeriCode(userId, veriCode):
    "Helper. Returns non-deactivated, unverified user."
    user = userMod.getUser(userId)
    if not user:
        return bu.abort("No such user or invitation.")
    if user.isVerified:
        return bu.abort("Already joined. Please log in.")
    if user.isDeactivated:
        return bu.abort("Account deactivated.")
    if not utils.checkPw(veriCode, user.hVeriCode):
        # print("veriCode = %r" % veriCode)
        # print("hVeriCode = %r" % user.hVeriCode)
        return bu.abort("Verification failed.")
    # ==> Valid veriCode.
    return user


@app.post("/userCon/fetchInvitedUserByVeriCode")
def post_userCon_fetchInvitedUserByVeriCode():
    j = bu.get_jdata(ensure="userId, veriCode")
    user = getUnverifiedUserByVeriCode(j.userId, j.veriCode)
    return {"user": userMod.snipUser(user)}


@app.post("/userCon/acceptInvite")
def post_userCon_acceptInvite():
    j = bu.get_jdata("userId email fname lname veriCode")
    user = getUnverifiedUserByVeriCode(j.userId, j.veriCode)
    assert all(
        [
            user._id == j.userId,
            user.email == j.email,
            user.fname == j.fname,  # <--- TODO: Allow changing?
            user.lname == j.lname,  # <--^
            utils.checkPw(j.veriCode, user.hVeriCode),
        ]
    )
    user.update({"isVerified": True})  # In-memory update.
    userMod.replaceUser(user)
    return auth.sendAuthSuccessResponse(user)


@app.post("/userCon/toggleUser_isDeactivated")
@auth.seshful
def post_userCon_toggleUser_isDeactivated(sesh):
    assert sesh.user.isAdmin
    jdata = bu.get_jdata(ensure="thatUserId, preToggle_isDeactivated")
    thatUser = userMod.getUser(
        {
            "_id": jdata.thatUserId,
            # No "isVerified" condition, as unverified (invited/pre-joined) users can be deactivated.
            "isDeactivated": jdata.preToggle_isDeactivated,
            # ^-- This helps ensure that we don't accidently perform the opposite op.
        }
    )
    if not thatUser:
        # ==> Couldn't find user to be de/reactivated.
        return bu.abort(
            "No such user. Can't de/reactivate. Please refresh (Ctrl+R) and retry."
        )
    # ==> User to be de/reactivated found.
    if thatUser._id == sesh.user._id:
        assert not thatUser.isDeactivated
        # ^-- Assert active. If deactivated, this line must be unreachable.
        return bu.abort("One can't deactivate their own account.")
    # ==> Not trying to deactivate own account.
    if thatUser.isPrime:
        assert not thatUser.isDeactivated
        # ^-- Assert active. Primary admin user cannot be deactivated.
        return bu.abort("Can't de/reactivate primary admin.")
    # ==> `thatUser` is NOT the primary admin.
    assert (
        thatUser
        and thatUser._id != sesh.user._id
        and
        # ^-- Like w/ db-query above, no 'isVerified' related assertion.
        thatUser.isDeactivated == jdata.preToggle_isDeactivated  # and
    )
    thatUser.update(
        {
            "isDeactivated": not thatUser.isDeactivated,
        }
    )
    assert userMod.validateUser(thatUser)
    userMod.replaceUser(thatUser)
    return {"user": userMod.snipUser(thatUser)}


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
