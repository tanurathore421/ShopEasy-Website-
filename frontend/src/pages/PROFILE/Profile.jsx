import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const getProfile = async () => {
      const token = localStorage.getItem("token");

      // Not logged in
      if (!token) {
        navigate("/auth");
        return;
      }

      try {
        const response = await axios.get(
          "http://localhost:3000/api/auth/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        console.log("PROFILE:", response.data);

        setUser(response.data);
      } catch (error) {
        console.error(
          "PROFILE ERROR:",
          error.response?.data || error.message
        );

        // Only logout if token is invalid
        if (error.response?.status === 401) {
          localStorage.removeItem("token");

          window.dispatchEvent(
            new Event("logout")
          );

          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");

    window.dispatchEvent(
      new Event("logout")
    );

    navigate("/auth");
  };

  if (loading) {
    return <h2>Loading profile...</h2>;
  }

  if (!user) {
    return <h2>Unable to load profile</h2>;
  }

  const details = [
    ["Full Name", user.name],
    ["Email Address", user.email],
    ["Phone Number", user.phone],
    ["Address", user.address],
  ];

  return (
    <main className="profile-page">

      <section className="profile-container">

        <header className="profile-header">
          <h1>My Profile</h1>

          <p>
            Manage your account information
          </p>
        </header>

        <section className="profile-card">

          <div className="profile-top">

            <span className="profile-avatar">
              {user.name
                ?.charAt(0)
                .toUpperCase()}
            </span>

            <h2>
              {user.name}

              <small>
                {user.email}
              </small>
            </h2>

            <button className="edit-btn">
              Edit Profile
            </button>

          </div>

          <div className="profile-details">

            {details.map(([label, value]) => (
              <p
                className="detail-box"
                key={label}
              >
                <span>{label}</span>

                <strong>
                  {value || "Not provided"}
                </strong>
              </p>
            ))}

          </div>

        </section>

        <section className="account-card">

          <h2>Account Settings</h2>

          <div className="setting-item">

            <p>
              <strong>My Orders</strong>

              <span>
                View and track your orders
              </span>
            </p>

            <button
              onClick={() => navigate("/orders")}
            >
              View
            </button>

          </div>

          <div className="setting-item">

            <p>
              <strong>Change Password</strong>

              <span>
                Update your account password
              </span>
            </p>

            <button>
              Change
            </button>

          </div>

          <div className="setting-item">

            <p>
              <strong>Logout</strong>

              <span>
                Sign out from your account
              </span>
            </p>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </section>

      </section>

    </main>
  );
}

export default Profile;
