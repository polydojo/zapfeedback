# std:
# n/a

# pip-ext:
import bottle

# pip-int:
# n/a

# loc:
# n/a

app = bottle.Bottle()


@app.get("/")
def get_hello():
    return "Hello, World!"


if __name__ == "__main__":
    app.run(host="localhost", port=8080, reloader=True, debug=True)
