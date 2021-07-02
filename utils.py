# std:
import time
import re
import random
import hashlib
import urllib.parse
import base64
import math
import datetime

# pip-int:
import dotsi

# pip-ext:
import bson
import bcrypt

# loc:
# n/a

# Listy map and filter: ::::::::::::::::::::::::::::::::::::

builtin_map = map


def map(seq, func):
    # Redefines map(). Allows any arg order. Returns a list, not map object.
    if callable(seq) and not callable(func):
        func, seq = seq, func
    return list(builtin_map(func, seq))


builtin_filter = filter


def filter(seq, func=lambda x: x):
    # Redefines filter(). Allows any arg order. Returns list, not filter object
    if callable(seq) and not callable(func):
        func, seq = seq, func
    return list(builtin_filter(func, seq))


def reject(seq, func=lambda x: x):
    # The anti-filter of sorts, ala _.reject. Arg-order neutral. Returns list.
    "The opposite of filter(). Returns list."
    if callable(seq) and not callable(func):
        func, seq = seq, func
    negFunc = lambda x: not func(x)
    return list(builtin_filter(negFunc, seq))


def each(seq, func):
    # Doesn't redefine stuff. Equivalent to JS' _.each(). Handy sometimes.
    if callable(seq) and not callable(func):
        func, seq = seq, func
    for x in seq:
        func(x)


builtin_all = all


def all(seq, func=None):
    # Redefines all(). Allows a second `func` param pre-check mapping.
    if func is None:
        return builtin_all(seq)
    # ==> seq & func both supplied:
    if callable(seq) and not callable(func):
        func, seq = seq, func
    return builtin_all(builtin_map(func, seq))
    # ^-- builtin_map() is more efficient than map(), as builtin_all() short-ckt.s


builtin_any = any


def any(seq, func=None):
    # Redefines any(). Allows a second `func` param pre-check mapping.
    if func is None:
        return builtin_any(seq)
    # ==> seq & func both supplied:
    if callable(seq) and not callable(func):
        func, seq = seq, func
    return builtin_any(builtin_map(func, seq))
    # ^-- builtin_map() is more efficient than map(), as builtin_any() short-ckt.s


def mapDicty(dIn, func):
    if callable(dIn) and not callable(func):
        func, dIn = dIn, func
    dOut = type(dIn)()  # <-- Blank dicty w/ same type as `dIn`.
    for (key, value) in dIn.items():
        dOut[key] = func(value)
    return dOut


mapObject = mapDicty  # Alias.
mapDict = mapDicty  # Alias.

## Math helpers: :::::::::::::::::::::::::::::::::::::::::::

floor = math.floor
ceil = math.ceil
sqrt = math.sqrt

floorInt = lambda n: int(math.floor(n))
ceilInt = lambda n: int(math.ceil(n))
roundInt = lambda n: int(round(n))

identityFunc = lambda x: x


# Working with miliseconds: ::::::::::::::::::::::::::::::::

now = lambda: int(time.time() * 1000)

EPOCH_DATE = datetime.datetime(1970, 1, 1)
ms_to_date = lambda x: (
    datetime.datetime.utcfromtimestamp(x / 1000)  # , NO comma
    # ^-- Important to use `utcfromtimestamp`, not just `fromtimestamp`.
)
date_to_ms = lambda date: (
    int((date - EPOCH_DATE).total_seconds() * 1000)  # , No comma
    # ^-- TODO: EPOCH_DATE shouldn't be required, right? Fix if needed.
)

hours_to_ms = lambda h: h * 60 * 60 * 1000
# ^-- `h` (hr) * 60 (min/hr) * 60 (sec/min) * 1000 (ms/sec)
days_to_ms = lambda d: hours_to_ms(d * 24)

ms_to_hours = lambda t: t / (60 * 60 * 1000)
ms_to_days = lambda t: ms_to_hours(t) / 24

# Generating ObjectIds: ::::::::::::::::::::::::::::::::::::

objectId = lambda: bson.ObjectId().__str__()

# Transcoding: :::::::::::::::::::::::::::::::::::::::::::::

str_to_bytes = lambda s, enc="utf8": s.encode(enc)
bytes_to_str = lambda b, enc="utf8": b.decode(enc)

str_to_b64_bytes = lambda s, enc="utf8": base64.b64encode(s.encode(enc))
b64_bytes_to_str = lambda b, enc="utf8": base64.b64decode(b).decode(enc)
# 'foo'   --s.encode-->  b'foo' --b64encode--> b'Zm9v'
# b'Zm9v' --b64decode--> b'foo' --.decode--> 'foo'

str_to_b64_str = lambda s, enc="utf8": str_to_b64_bytes(s, enc).decode(enc)
b64_str_to_str = lambda s, enc="utf8": b64_bytes_to_str(s.encode(enc))
# 'foo'  --str_to_base64_bytes--> b'Zm9v' --> 'Zm9v'
# 'Zm9v' --.enode--> b'Zm9v' --b64_bytes_to_str--> 'foo'

# URL Related: :::::::::::::::::::::::::::::::::::::::::::::

quote = lambda s: urllib.parse.quote(s, safe="")
unquote = urllib.parse.unquote
# Alias.

qs = dotsi.fy({})

qs.loads = lambda s: dotsi.fy(dict(urllib.parse.parse_qsl(s)))
# In qs.loads, a=a&b=b&a=A --> {"a":"A", "b":"b"}; i.e. last value is considered.

qs.dumps = lambda d: urllib.parse.urlencode(d, safe="", quote_via=urllib.parse.quote)
# In qs.dumps, we quote_via parse.quote() w/ safe='', not the default parse.quote_plus().


# Asserting: :::::::::::::::::::::::::::::::::::::::::::::::

# Although the var name starts w/ `is` and not `check`, they're functions:
isStr = lambda x: type(x) is str
isStringy = lambda x: type(x) in [str, bytes]
isList = lambda x: type(x) is list
isListy = lambda x: type(x) in [list, tuple]
isDict = lambda x: type(x) is dict
isDicty = lambda x: isinstance(x, dict)
isBool = lambda x: type(x) is bool
isInt = lambda x: type(x) is int
isInty = lambda x: isinstance(x, int)  # This includes intances of bson.int64.Int64
isFloat = lambda x: type(x) is float
isFloaty = lambda x: isinstance(x, float)
isNumber = lambda x: isInty(x) or isFloaty(x)
isPositiveNumber = lambda x: isNumber(x) and x > 0
isNonNegativeNumber = lambda x: isNumber(x) and x >= 0
isFuncy = lambda x: callable(x)


def isIterable(x):
    try:
        iter(x)
        return True
    except Exception as e:
        return False


isTruthyStr = lambda x: x and isStr(x)
isTruthyStringy = lambda x: x and isStringy(x)

isObjectId = lambda x: isStr(x) and re.match(r"^[0-9a-f]{24}$", x)
# ^-- Matches 24 (lowercase) hex digits.

isBlankOrObjectId = lambda x: (x == "") or isObjectId(x)

isObjectIdList = lambda x: isList(x) and all(map(isObjectId, x))
# ^-- Accepts a list of objectIds.

isMultiObjectId = lambda x: isObjectIdList(x.split("_"))
# ^-- Accepts any number of underscore-separated objectIds.

isStrList = lambda x: isList(x) and all(map(isStr, x))

isSha256 = lambda x: isStr(x) and re.match(r"^[0-9a-f]{64}$", x)
# ^-- Matches 64 (lowercase) hex digits.

isFrandex = lambda x: isStr(x) and re.match(r"0\d+", x)
# ^-- TODO: Reconsider func definition.

isMimeType = lambda x: isTruthyStr(x) and ("/" in x) and (" " not in x)
# ^-- Must have '/' and must not include spaces.

isNone = lambda x: x is None
isNoneOr = lambda func, x: isNone(x) or func(x)
# ^-- Eg: utils.isNoneOr(utils.isObjectId, action.sigS3Id)

mkIsNoneOr = lambda func: (lambda x: x is None or func(x))  # ,
# ^-- Eg: utils.mkIsNoneOr(utils.isObjectId)

isNoneOrObjectId = mkIsNoneOr(isObjectId)
isNoneOrStr = mkIsNoneOr(isStr)

# Deep Copying: ::::::::::::::::::::::::::::::::::::::::::::


def isPrimitive(x):
    return type(x) in [
        int,
        float,
        bson.int64.Int64,  # Number
        str,
        bytes,  # String
        bool,  # Boolean
        type(None),  # None
    ]


def deepCopy(x):
    if isPrimitive(x):
        return x
    if type(x) in [list, tuple]:
        return map(deepCopy, x)
    if type(x) in [dict, dotsi.Dict]:
        return type(x)(
            dict(
                zip(
                    x.keys(),
                    map(deepCopy, x.values()),
                )
            )
        )
    raise Exception(
        "Deep-copying failed. Can't copy objects of type "
        + repr(type(x))
        + ". The object was: "
        + repr(x)
    )


# Randomization: :::::::::::::::::::::::::::::::::::::::::::


def randomDigits(digitCount):
    s = ""
    while len(s) < digitCount:
        s += random.random().__str__().split(".")[-1]
    return s[:digitCount]


# Underscore.js related: :::::::::::::::::::::::::::::::::::


def pick(dIn, keyz_or_func):
    "Essential `filter(.)` for objects. Inspried by JS' _.pick(.)."

    # Setup key-picking `func`:
    if type(keyz_or_func) in [str, list]:
        keyList = readKeyz(keyz_or_func)
        func = lambda s: s in keyList
    elif callable(keyz_or_func):
        func = keyz_or_func
    # ==> `func` is now available. Should be callable.
    assert callable(func)

    # Apply key-picking `func`:
    assert isDicty(dIn)
    dOut = type(dIn)({})
    # Empty dicty of type(dIn);
    for k in dIn:
        if func(k):
            dOut[k] = dIn[k]
    return dOut


def pluck(key, li):  # Argument order doesn't matter.
    if isListy(key) and isStringy(li):
        key, li = li, key
    # print("utils.pluck:: key = ", key);
    assert isStringy(key)
    return map(lambda x: x[key], li)


def flatten(arr, isInShallowMode=False, listyTypeList=None):
    # Similar to underscore.js' _.flatten, the last param is py-specific.
    "Flattens a list, as defined by `listyTypes`."
    listyTypeList = listyTypeList or [list, tuple]
    assert type(arr) in listyTypeList
    out = []
    for x in arr:
        if type(x) not in listyTypeList:
            out.append(x)
        else:
            # ==> x IS LISTY.
            if isInShallowMode:
                out = out + x
            else:
                out = out + flatten(x)
    return out


def unique(listy):
    assert isListy(listy)
    return list(set(listy))


uniq = unique
# ALIAS

# Set theory related: ::::::::::::::::::::::::::::::::::::::


def isSuperset(bigSeq, smallSeq):
    assert isIterable(bigSeq) and isIterable(smallSeq)
    return set(bigSeq).issuperset(set(smallSeq))


def isSubset(smallSeq, bigSeq):
    assert isIterable(smallSeq) and isIterable(bigSeq)
    return set(smallSeq).issubset(set(bigSeq))


def intersection(seqA, seqB):
    assert isIterable(seqA) and isIterable(seqB)
    return list(set(seqA).intersection(set(seqB)))


def union(seqA, seqB):
    assert isIterable(seqA) and isIterable(seqB)
    return list(set(seqA).union(set(seqB)))


# Password Hashing: ::::::::::::::::::::::::::::::::::::::::


def hashPw(pw, rounds=None):
    assert type(pw) is str
    b_pw = str_to_bytes(pw)
    # Bytes
    b_salt = bcrypt.gensalt(rounds) if rounds else bcrypt.gensalt()
    # Note: Not passing None to gensalt as int is req'd.
    b_hpw = bcrypt.hashpw(b_pw, bcrypt.gensalt())
    # Hashed
    return bytes_to_str(b_hpw)


def checkPw(pw, hpw):
    assert type(pw) == str == type(hpw)
    b_pw = str_to_bytes(pw)
    b_hpw = str_to_bytes(hpw)
    return bcrypt.checkpw(b_pw, b_hpw)


def test_hashPw_checkPw():
    pw = "Ich bin das Passwort"
    hpw = hashPw(pw)
    assert checkPw(pw, hpw) is True
    assert checkPw(pw, hpw[:-1]) is False
    assert checkPw(pw, hpw + "x") is False
    assert checkPw(pw[1:], hpw) is False
    assert checkPw("wrong", hpw) is False
    return True


# Other: :::::::::::::::::::::::::::::::::::::::::::::::::::


def readKeyz(keyz):
    "Helps read comma/space keys into list."
    if type(keyz) is list:
        return keyz
    # ==> Not a `list`, expecting `str`:
    assert type(keyz) is str
    if "," in keyz:
        # ==> Comma separated
        return filter(map(str.strip, keyz.split(",")))
    # ==> Not comma separated
    if " " in keyz:  # <-- TODO: Check for any whitespace, not just " ".
        # ==> Space separated
        return keyz.split()
        # Split on (any) whitespace.
    # ==> Neither comma separated, nor space separated.
    # Assuming single key, putting in list.
    return [keyz.strip()]


def test_readKeyz():
    abc = ["a", "b", "c"]
    assert readKeyz(["a", "b", "c"]) == abc
    assert readKeyz("a, b, \n c") == abc
    assert readKeyz("a,b,c") == abc
    assert readKeyz("a,b,c,") == abc
    assert readKeyz("a,b,c,,, ,,,") == abc
    assert readKeyz("a") == ["a"]
    return True


def unpack(dicty, keyz, strict=True):
    # In strict mode, dicty can also be a list, as list.__getitem__() works.
    keyList = readKeyz(keyz)
    if strict:
        assert isDicty(dicty) or isListy(dicty)
        return map(dicty.__getitem__, keyList)
        # ^-- d.__getitem__(k) is like dicty[k], raises KeyError if k not in d.
    else:
        assert isDicty(dicty)
        return map(dicty.get, keyList)
        # ^-- Unlike d.__getitem__(),  d.get(k) returns None if k not in d.
    return map(dicty.get, keyz)


def test_unpack():
    d = {"a": "a", "b": "b", "c": "c"}
    assert unpack(d, "a, b") == ["a", "b"]
    assert unpack(d, ["b", "c"]) == ["b", "c"]
    assert unpack(d, "a") == ["a"]
    return True


def buildScaledDicty(dIn, factor, rounder=None):
    "Returns a scaled (non-alias) copy of supplied dict."
    assert isDicty(dIn)
    assert isNumber(factor) and factor != 0
    dOut = type(dIn)()
    # ^-- Init `dOut` as empty dicty of same type as dIn.
    rounder = rounder or (lambda x: x)
    # ^-- Rounding defaults to the identity fn.
    for k in dIn:
        assert isNumber(dIn[k])
        dOut[k] = rounder(factor * dIn[k])
    return dOut


def addNummyDicts(dX, dY, mX=1, mY=1):
    # Output = (mX*dX) + (mY*dY) where dX = dictyX, mX = multiplier for dX
    "Adds dicties dX and dY, after multiplying mX and mY respectively."
    assert isDicty(dX) and type(dX) is type(dY)
    dTot = type(dX)()
    # ^-- Init dTot as empty dicty of type(dX);
    keySet = union(dX.keys(), dY.keys())
    # print("keySet =", keySet);
    for key in keySet:
        dTot[key] = mX * dX.get(key, 0) + mY * dY.get(key, 0)
    return dTot


def mk_stripEachLine(stripFunc):
    "Returns a func that strips each line in multiline str, as per `stripFunc`."

    def built_stripEachLine(multilineStr):
        inputLineList = multilineStr.split("\n")
        outputLineList = []
        for line in inputLineList:
            outputLineList.append(stripFunc(line))
        return "\n".join(outputLineList)

    # Finally:
    return built_stripEachLine


# Immediate use:
stripEachLine = mk_stripEachLine(str.strip)
lstripEachLine = mk_stripEachLine(str.lstrip)
rstripEachLine = mk_stripEachLine(str.rstrip)

# MAIN / AUTO-TESTING: :::::::::::::::::::::::::::::::::::::


def runAllTests():
    for (key, value) in globals().items():
        if key.startswith("test_") and callable(value):
            assert value()
    # ==> All tests passed.
    print("utils.py: All tests passed.")


if __name__ == "__main__":
    runAllTests()

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
