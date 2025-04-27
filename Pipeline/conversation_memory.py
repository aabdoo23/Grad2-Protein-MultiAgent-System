class ConversationMemory:
    def __init__(self):
        self.sessions = {}  # {session_id: {"history": [...], "state": {}}}

    def init_session(self, session_id: str):
        self.sessions[session_id] = {"history": [], "state": {}}

    def add_message(self, session_id: str, role: str, message: str):
        self.sessions[session_id]["history"].append({"role": role, "message": message})

    def get_history(self, session_id: str):
        return self.sessions[session_id]["history"]

    def update_state(self, session_id: str, key: str, value: any):
        self.sessions[session_id]["state"][key] = value

    def get_state(self, session_id: str):
        return self.sessions[session_id]["state"]
