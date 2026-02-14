import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both the field is requried");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("room is created");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
            <div className="card-body text-center bg-dark position-relative">
              <div className="position-absolute top-0 end-0 p-3">
                <button
                  onClick={handleLogout}
                  className="btn btn-danger btn-sm"
                  title="Logout"
                >
                  Logout
                </button>
              </div>

              {user && (
                <div className="mb-3">
                  <span className="badge bg-success">
                    Welcome, {user.username}!
                  </span>
                </div>
              )}

              { <img
                src="/images/codeverse.png"
                alt="Logo"
                className="img-fluid mx-auto d-block"
                style={{ maxWidth: "250px" }}
                />
              }
              <h4 className="card-title text-light mb-4">Enter the ROOM ID</h4>

              <div className="form-group">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="form-control mb-2"
                  placeholder="ROOM ID"
                  onKeyUp={handleInputEnter}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control mb-2"
                  placeholder="USERNAME"
                  onKeyUp={handleInputEnter}
                />
              </div>
              <button
                onClick={joinRoom}
                className="btn btn-success btn-lg btn-block"
              >
                JOIN
              </button>
              <p className="mt-3 text-light">
                Don't have a room ID? create{" "}
                <span
                  onClick={generateRoomId}
                  className=" text-success p-2"
                  style={{ cursor: "pointer" }}
                >
                  {" "}
                  New Room
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
