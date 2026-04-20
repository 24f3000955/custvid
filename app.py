from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)
QUEUE_FILE = os.path.join(os.path.dirname(__file__), "videos.json")


def load_queue():
    if not os.path.exists(QUEUE_FILE):
        return []
    with open(QUEUE_FILE, "r") as f:
        return json.load(f)


def save_queue(queue):
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/queue", methods=["GET"])
def get_queue():
    return jsonify(load_queue())


@app.route("/api/queue/add", methods=["POST"])
def add_video():
    data = request.get_json()
    title = data.get("title", "").strip()
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL required"}), 400
    queue = load_queue()
    queue.append({"title": title or "Untitled", "url": url})
    save_queue(queue)
    return jsonify({"ok": True, "count": len(queue)})


@app.route("/api/queue/remove/<int:index>", methods=["DELETE"])
def remove_video(index):
    queue = load_queue()
    if 0 <= index < len(queue):
        queue.pop(index)
        save_queue(queue)
        return jsonify({"ok": True})
    return jsonify({"error": "Index out of range"}), 400


@app.route("/api/queue/reorder", methods=["POST"])
def reorder_queue():
    data = request.get_json()
    new_order = data.get("order", [])
    queue = load_queue()
    if sorted(new_order) != list(range(len(queue))):
        return jsonify({"error": "Invalid order"}), 400
    queue = [queue[i] for i in new_order]
    save_queue(queue)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)