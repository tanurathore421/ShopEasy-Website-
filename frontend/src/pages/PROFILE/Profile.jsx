import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const API_URL = "http://localhost:3000/api/auth";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // GET PROFILE
  useEffect(() => {
    const getProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/auth");
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/profile`, {
          headers: getHeaders(),
          withCredentials: true,
        });

        const data = response.data.user || response.data;

        setUser(data);

        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
        });
      } catch (err) {
        console.error("PROFILE ERROR:", err);

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("logout"));
          navigate("/auth");
        } else {
          setError(err.response?.data?.message || "Unable to load profile");
        }
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate]);

  // EDIT INPUT
  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // UPDATE PROFILE
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.put(`${API_URL}/profile`, profile, {
        headers: getHeaders(),
        withCredentials: true,
      });

      const updatedUser = response.data.user;

      setUser(updatedUser);

      setProfile({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
      });

      setEditMode(false);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  // PASSWORD INPUT
  const handlePasswordChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });
  };

  // CHANGE PASSWORD
  const handleChangePassword = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match");
      setSaving(false);
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/change-password`,
        passwords,
        {
          headers: getHeaders(),
          withCredentials: true,
        },
      );

      setMessage(response.data.message || "Password changed successfully!");

      setPasswords({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordMode(false);
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");

    window.dispatchEvent(new Event("logout"));

    navigate("/auth");
  };

  if (loading) {
    return <h2>Loading profile...</h2>;
  }

  if (!user) {
    return (
      <div className="profile-page">
        <h2>{error || "Unable to load profile"}</h2>
        <button onClick={() => navigate("/auth")}>Go to Login</button>
      </div>
    );
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
          <p>Manage your account information</p>
        </header>

        {message && <div className="profile-success">{message}</div>}

        {error && <div className="profile-error">{error}</div>}

        {/* PROFILE CARD */}
        <section className="profile-card">
          <div className="profile-top">
            <span className="profile-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </span>

            <h2>
              {user.name}
              <small>{user.email}</small>
            </h2>

            <button
              className="edit-btn"
              onClick={() => {
                setError("");
                setMessage("");
                setPasswordMode(false);
                setEditMode(!editMode);
              }}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {editMode ? (
            <form className="profile-form" onSubmit={handleUpdateProfile}>
              <label>Full Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                required
              />

              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                required
              />

              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  if (value.length <= 10) {
                    setProfile({
                      ...profile,
                      phone: value,
                    });
                  }
                }}
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10 digit Indian mobile number"
                required
              />
              <label>Address</label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                rows="3"
              />

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            <div className="profile-details">
              {details.map(([label, value]) => (
                <p className="detail-box" key={label}>
                  <span>{label}</span>
                  <strong>{value || "Not provided"}</strong>
                </p>
              ))}
            </div>
          )}
        </section>

        {/* ACCOUNT SETTINGS */}
        <section className="account-card">
          <h2>Account Settings</h2>

          <div className="setting-item">
            <p>
              <strong>My Orders</strong>
              <span>View and track your orders</span>
            </p>

            <button onClick={() => navigate("/orders")}>View</button>
          </div>

          <div className="setting-item">
            <p>
              <strong>Change Password</strong>
              <span>Update your account password</span>
            </p>

            <button
              onClick={() => {
                setError("");
                setMessage("");
                setEditMode(false);
                setPasswordMode(!passwordMode);
              }}
            >
              {passwordMode ? "Cancel" : "Change"}
            </button>
          </div>

          {passwordMode && (
            <form
              className="profile-form password-form"
              onSubmit={handleChangePassword}
            >
              <label>Old Password</label>
              <input
                type="password"
                name="oldPassword"
                value={passwords.oldPassword}
                onChange={handlePasswordChange}
                required
              />

              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                minLength="8"
                required
              />

              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                minLength="8"
                required
              />

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <div className="setting-item">
            <p>
              <strong>Logout</strong>
              <span>Sign out from your account</span>
            </p>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Profile;

/* import { useEffect, useState } from "react";
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
 */
