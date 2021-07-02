# std:
import os
import time
import json
import random
import functools

# pit-ext:
import bottle

# pip-int:
import dotsi

# loc:
import hashUp
import utils

request = bottle.request
response = bottle.response
redirect = bottle.redirect
staticFile = bottle.static_file

############################################################
# Config related:                                          #
############################################################

config = dotsi.fy({"cookieSecret": "__default_cookie_secret_123__"})
# Exo-module: bu.config.cookieSecret = "new secret"; Or use .update({});


def setCookieSecret(newCookieSecret):
    config.cookieSecret = newCookieSecret


############################################################
# Static and shortcut related:                             #
############################################################


def addStaticFolder(app, folderPath, slug=None):
    "Helps serve static files in `folderPath`."
    folderPath = os.path.abspath(folderPath)
    assert "/" in folderPath
    slug = slug or folderPath.split("/")[-1]

    @app.get("/" + slug + "/<filepath:path>")
    def get_slug_plus(filepath):
        if filepath.endswith("/"):
            return redirect("/" + slug + "/" + filepath + "index.html")
        return staticFile(filepath, folderPath)

    @app.get("/" + slug)
    @app.get("/" + slug + "/")
    def get_slug_top():
        return redirect("/" + slug + "/" + "index.html")


def addSingleShortcut(app, srcPath, tgtUrl):  # Simple (internal) helper.
    "Adds redirection route from `srcPath` to `tgtUrl` (either URl or path)."

    @app.get(srcPath)
    def redirector():
        srcQs = request.urlparts.query
        if not srcQs:
            return redirect(tgtUrl)
        # ==> Source URL has query string.
        if not "?" in tgtUrl:
            return redirect(tgtUrl + "?" + srcQs)
        # ==> Target URL already has query string.
        return redirect(tgtUrl + "&" + srcQs)


def addShortcuts(app, pathMap, suffixList=["/", ".html"]):
    "Adds multiple shortcuts from pathMap's keys to values."
    for srcPath, tgtUrl in pathMap.items():
        addSingleShortcut(app, srcPath, tgtUrl)
        # ^-- Eg: '/signup' --> '/front/signup.html'
        for suffix in suffixList:
            addSingleShortcut(app, srcPath + suffix, tgtUrl)
            # ^-- Eg: '/signup/' --> '/front/signup.html' (where '/' is suffix.)


def setMemfileMax(memfileMax):
    bottle.BaseRequest.MEMFILE_MAX = memfileMax


############################################################
# Rendering related:                                       #
############################################################


def addTemplateFolder(folderPath):
    "Tells bottle to look for templates in `folderPath`."
    bottle.TEMPLATE_PATH.append(os.path.abspath(folderPath))
    return None


defaultRenderParams = {}


def enableUnderscoreFriendlyRendering():
    defaultRenderParams.update(
        {
            "template_settings": {
                "syntax": "<python> </python> @ {{py: }}",
                # ^-- default_syntax = '<% %> % {{ }}'
                # format: 'block_start block_close line_start inline_start inline_end
            },
        }
    )
    # Note: You can't use '%' as 'line_start' because
    #   you tend to write js (underscore) blocks as:
    #       <%
    #           var foo = "bar";
    #       %>
    #   If 'line_start' is "%", then the last line of
    #   code above, i.e. "%>\n" would raise a SyntaxError.


def render(tplName, **kwargs):
    "Renders templates."
    for dpKey in defaultRenderParams:
        if dpKey not in kwargs:
            kwargs[dpKey] = defaultRenderParams[dpKey]
    return bottle.template(tplName, **kwargs)


def view(tplName):
    "Returns a decorator for rendering templates."

    def renderDecorator(oFunc):
        def nFunc(*args, **kwargs):
            d = oFunc(*args, **kwargs)
            return render(tplName, **d)

        return functools.update_wrapper(nFunc, oFunc)

    return renderDecorator


############################################################
# Aborting related:                                        #
############################################################


def abort(x, code=None, req=None):
    "Aborts with a smartly-picked `code`, if unspecified."
    req = req or bottle.request
    if req.content_type != "application/json":
        code = code or 404
        # ^-- All non-JSON requests are default-aborted w/ "404 Not Found"
        assert type(x) is str
        return bottle.abort(code, x)
    # ==> We're dealing w/ a JSON request.
    code = code or 418
    # ^-- All JSON requests are, by default, aborted w/ "418 I'm a teapot"
    if isinstance(x, Exception) and x.message:
        d = {"status": "fail", "reason": x.message}
    elif type(x) is str:
        d = {"status": "fail", "reason": x}
        # print(d);
    else:
        assert all(
            [
                type(x) in [dict, dotsi.Dict],
                x["status"] == "fail",
                type(x["reason"]) is str,
            ]
        )
        d = dict(x)
    return bottle.abort(code, d)


abort200 = lambda html: abort(html, 200)


def renderAndAbort(tplName, **kwargs):
    "Combines render and abort200 into a single function."
    return abort200(render(tplName, **kwargs))


def claim(stmt, error=None, code=None):
    "An assert-like wrapper around `abort(.)`."
    if stmt:
        return True
        # Short ckt.
    # ==> Claim failed.
    error = error or "The claimed resource could not be found."
    # ^-- Default was: "Claim failed." ... But that makes no sense to users.
    assert type(error) is str
    return abort(error, code)


def claimKeys(dicty, keyList, error=None, code=None):
    "Helps claim that each key in keyList are in dicty."
    # if type(dicty) is list and type(keyList) in [dict, dotsi.Dict]:
    #    dicty, keyList = keyList, dicty;    # Pythonic swap.
    for key in keyList:
        assert claim(key in dicty, error or "Key not found: %s" % key, code)
    return True


############################################################
# Query params & form data related:                        #
############################################################


def getRequestQueryParamData():
    "Wrapper around bottle.request.query."
    return dotsi.Dict(request.query)


get_qdata = getRequestQueryParamData
# ^-- Alias.


def getRequestPostBodyParamData():
    "Wrapper around bottle.request.forms."
    return dotsi.Dict(request.forms)


get_pdata = getRequestPostBodyParamData
# ^-- Alias.


def getRequestJson(ensure=None):
    "Get request.body.json as edict, with option to ensure keys."
    #
    if request.content_type != "application/json":
        print("\n\n\trequest.content_type = %s\n\n" % request.content_type)
        return abort(
            "".join(
                [
                    "INCOMPATIBLE BROWSER.\n",
                    "\n",
                    "Your browser can't handle JSON data.\n"
                    "Please update or switch your browser.\n"
                    "\n",
                    # "See: " + K.SITE_URL + "/browser-update",
                ]
            )
        )
    # ==> We're dealing with a proper JSON request.
    assert request.content_type == "application/json"
    idata = dotsi.Dict(request.json)
    if not ensure:
        # ==> Nothing to be ensured:
        return idata
    # ==> We're required to ensure something(s):
    assert type(ensure) in [list, str]
    keyList = utils.readKeyz(ensure)
    if keyList:
        assert claimKeys(idata, keyList)
    # ==> All claims (if any) passed.
    return idata


get_jdata = getRequestJson
# ^-- Alias.


def unpackRequestJson(keyz):
    jdata = get_jdata(ensure=keyz)
    return utils.unpack(jdata, keyz)


unpack_jdata = unpackRequestJson
# ^-- Alias.


############################################################
# Hashing & cookie related:                                #
############################################################

hasher = hashUp.buildHasher()


def setUnsignedCookie(
    name,
    value,
    resp=None,
    httpOnly=True,
    path="/",
    maxAge=None,
):
    "Sets an unsigned, default-httpOnly cookie."
    resp = resp or response
    assert type(httpOnly) is bool
    assert type(path) is str
    assert maxAge is None or type(maxAge) is int
    if type(maxAge) is int:
        resp.set_cookie(
            name,
            value,
            httponly=httpOnly,
            path=path,
            max_age=maxAge,
        )
    else:
        resp.set_cookie(
            name,
            value,
            httponly=httpOnly,
            path=path,  # w/o max_age kwarg
        )
        # ^-- max_age, if passed, shouldn't be None. (bottle)
    return value


def setCookie(
    name,
    data,
    secret=None,
    resp=None,
    httpOnly=True,
    path="/",
    maxAge=None,
):
    "Sets a signed, default-httpOnly cookie."
    secret = secret or config.cookieSecret
    signWrapped = hasher.signWrap(data, secret)
    setUnsignedCookie(
        name,
        value=signWrapped,
        resp=resp,
        httpOnly=httpOnly,
        path=path,
        maxAge=maxAge,
    )
    return signWrapped


# Note: There's no .getUnsignedCookie() as unsigned
#       cookies should not be trusted by the server.


def getCookie(name, secret=None, strict=True, req=None):
    "Gets a signed HTTP-only cookie."
    req = req or bottle.request
    secret = secret or config.cookieSecret
    signWrapped = req.get_cookie(name)
    if not signWrapped:
        if strict:
            return abort("Session not found. Please log in.", req=req)
            # Short ckt.
        return None
    # ==> FOUND _some_ stringy cookie data.
    try:
        data = hasher.signUnwrap(signWrapped, secret=secret)
    except hasher.SignatureInvalidError as e:
        # ==> Bad cookie data.
        time.sleep(random.random() * 2)
        # ^-- Randomly sleep between [0, 2) seconds, making timing-attacks difficult.
        clearCookie(name, req=req)
        # ^-- TODO: Investigate if bottle actually clears cookies along w/ abort(.);
        return abort(
            "Malformed session encountered. Please log out and then log in.", req=req
        )
    # ==> SIGNATURE OK. (Valid and non-expired.)
    return data


def clearCookie(name, **kwargs):
    setUnsignedCookie(name, "", **kwargs)
    # Note: This function is IDEMPOTENT and does not
    #       test whether the cookie with name `name`
    #       has a valid value (or any value) before
    #       clearing it.


############################################################
# Plugins.                                                 #
############################################################


def mkPlugin_enforeSchemeAndNetloc(reqdScheme, reqdNetloc):
    "Creates plugin (decorator) for ensuring proper scheme & netloc."
    assert reqdScheme in ["http", "https"]

    def plugin_enforceSchemeAndNetloc(oFunc):
        "Plugin for ensuring proper scheme and netloc."

        def nFunc(*args, **kwargs):
            scheme = request.urlparts.scheme
            netloc = request.urlparts.netloc
            if scheme == reqdScheme and netloc == reqdNetloc:
                # ==> Good scheme and netloc.
                return oFunc(*args, **kwargs)
            # ==> Bad scheme/netloc.
            url = request.url
            url = url.replace(scheme, reqdScheme, 1)
            url = url.replace(netloc, reqdNetloc, 1)
            return redirect(url)

        return functools.update_wrapper(nFunc, oFunc)

    # Return the created plugin:
    return plugin_enforceSchemeAndNetloc


def plugin_noindex(oFunc):
    "Plugin adds `X-Robots-Tag: noindex` response header."

    def nFunc(*args, **kwargs):
        result = oFunc(*args, **kwargs)
        if isinstance(result, bottle.BaseResponse):
            result.set_header("X-Robots-Tag", "noindex")
            # ^-- If result is/based-on BaseResponse, use result.set_header().
        else:
            response.set_header("X-Robots-Tag", "noindex")
            # ^-- Else use globally available bottle.response.set_header().
        return result

    return functools.update_wrapper(nFunc, oFunc)


def plugin_frameDeny(oFunc):
    "Plugin adds `X-Frame-Options: DENY` response header."

    def nFunc(*args, **kwargs):
        result = oFunc(*args, **kwargs)
        if isinstance(result, bottle.BaseResponse):
            result.set_header("X-Frame-Options", "DENY")
            # ^-- If result is/based-on BaseResponse, use result.set_header().
        else:
            response.set_header("X-Frame-Options", "DENY")
            # ^-- Else use globally available bottle.response.set_header().
        return result

    return functools.update_wrapper(nFunc, oFunc)


def plugin_timer(oFunc):
    "Plugin for measuring exec-time in miliseconds."

    def nFunc(*args, **kwargs):
        start = utils.now()
        result = oFunc(*args, **kwargs)
        delta = utils.now() - start
        if isinstance(result, bottle.BaseResponse):
            result.set_header("X-Exec-Time", str(delta))
            # ^-- If result is/based-on BaseResponse, use result.set_header().
        else:
            response.set_header("X-Exec-Time", str(delta))
            # ^-- Else use globally available bottle.response.set_header().
        return result

    return functools.update_wrapper(nFunc, oFunc)


############################################################
# Misc.                                                    #
############################################################


def setResponseHeaders(headerMap):
    for name, val in headerMap.items():
        response.set_header(name, val)


def getClientIp():
    "Returns the client machine's IP Address."
    return (
        request.headers.get("CF-Connecting-IP")
        or request.environ.get("HTTP_X_FORWARDED_FOR")
        or request.environ.get("REMOTE_ADDR")
        or None  # or
    )


def getSlashlessWebRoot():
    "Returns slashless web root for current request."
    return "%s://%s" % (
        request.urlparts.scheme,
        request.urlparts.netloc,
    )


############################################################
# App builder function:                                    #
############################################################


def buildApp(pluginList=None):
    "Builds a new WSGI (bottle) app."
    app = bottle.Bottle()
    pluginList = pluginList or []
    for plugin in pluginList:
        app.install(plugin)

    @app.error(200)
    @app.error(418)
    def error_200(error):
        return error.body

    return app
