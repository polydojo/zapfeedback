"""
Helper module for sending emails via SMTP.

Use emailer.setSmtpConfig(host, port, username, password)
    to configure SMTP settings.

Then emailer.enableSending()
    to enable actually sending (vs just printing) of emails.

Then you can email.send(fromName, fromEmail, toList, subject, body, ...)
    to send emails.
"""

# std:
import smtplib
from email.message import EmailMessage
from email.header import Header

# pip-ext:
# n/a

# pip-int:
# n/a

# loc:
import utils

IS_SENDING_ENABLED = False  # <-- Disabled by default.
# ^-- Disabled => just print to console, else send via SMTP.


def enableSending(shouldEnable=True):
    global IS_SENDING_ENABLED
    # TODO: Check for valid `config` and `defaultSender` first.
    IS_SENDING_ENABLED = shouldEnable


def checkSendingEnabled():
    return IS_SENDING_ENABLED


config = {  # <-- Container for SMTP-related settings.
    "host": None,
    "port": None,
    "username": None,
    "password": None,
}


def setSmtpConfig(host, port, username, password, starttls=True):
    "Set SMTP related configuration settings."
    config.update(
        {
            "host": host,
            "port": int(port),
            "username": username,
            "password": password,
            "starttls": starttls,
        }
    )
    return True


defaultSender = {
    "fromName": None,
    "fromEmail": None,
}


def setDefaultSender(fromName, fromEmail):
    defaultSender.update(
        {
            "fromName": fromName,
            "fromEmail": fromEmail,
        }
    )
    return True


def buildMessage(
    fromName,
    fromEmail,
    toList,
    subject,
    body,
    subtype,
    ccList,
    bccList,
):
    "Internal helper for building EmailMessage objects."
    msg = EmailMessage()
    msg["From"] = "%s <%s>" % (fromName, fromEmail)
    # ^--  TODO: Consider quoting via email.header.Header(). (Consider q'ing all.)
    msg["To"] = ", ".join(toList)
    # ^-- toList is expected to be a list of (raw) email ids. ["a@b.c", "d@e.f" ..]
    if ccList:
        msg["Cc"] = ", ".join(ccList)
    if bccList:
        msg["Bcc"] = ", ".join(bccList)
        # ^-- This doesn't work in py2, but works in py3. Tested w/ SMTP broadcast.
    msg["Subject"] = subject
    msg.set_content(body, subtype=subtype)
    return msg


def sendBuiltMessage(msg):
    "Internal helper for connecting to and sending via SMTP."
    with smtplib.SMTP(config["host"], config["port"]) as smtp:
        smtp.ehlo()
        if config["starttls"]:
            smtp.starttls()
            smtp.ehlo()
        smtp.login(config["username"], config["password"])
        smtp.send_message(msg)
    return True


def printBuiltMessage(msg):
    "Helper for printing/inspecting built EmailMessage objects."
    print("Built message as_string: :::::::::::::::::::::")
    print("----------------------------------------------")
    print(msg.as_string())
    print("----------------------------------------------")
    return True


def send(
    toList,
    subject,
    body,
    fromName=None,
    fromEmail=None,
    subtype="plain",
    ccList=None,
    bccList=None,
):
    "Main method of the module, for sending emails."
    # Fill defaults:
    fromName = fromName or defaultSender["fromName"]
    fromEmail = fromEmail or defaultSender["fromEmail"]
    assert subtype in ["plain", "html"]
    ccList = ccList or []
    bccList = bccList or []
    if subtype == "plain":
        body = utils.stripEachLine(body)
        # ^-- For plain text emails, strip each line to avoid leading whitespace.
    # Build message:
    msg = buildMessage(
        fromName, fromEmail, toList, subject, body, subtype, ccList, bccList
    )
    # printBuiltMessage(msg); # debug aid
    # Send or print:
    if IS_SENDING_ENABLED:
        sendBuiltMessage(msg)
    else:
        printBuiltMessage(msg)
    return msg
    # Returned for insepction or reference.


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
