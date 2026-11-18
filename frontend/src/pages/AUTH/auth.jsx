import { useState, useEffect } from "react";
import axios from "axios";
import "./auth.css";
import { useNavigate } from "react-router-dom";

function Auth({ onClose, onLoginSuccess }) {
  const navigate = useNavigate();

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");

  // Register states
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("login");

  // =========================
  // CLOSE AUTH
  // =========================
  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    } else {
      navigate("/");
    }
  };

  // =========================
  // GET CAPTCHA
  // =========================
  const getCaptcha = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/captcha/captcha",
        {
          withCredentials: true,
        },
      );

      setCaptchaImage(response.data.captcha);
      setCaptcha("");
    } catch (error) {
      console.error("CAPTCHA ERROR:", error);
    }
  };

  useEffect(() => {
    getCaptcha();
  }, []);

  // =========================
  // LOGIN
  // =========================
  /*  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password || !captcha) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        {
          email,
          password,
          captcha,
        },
        {
          withCredentials: true,
        }
      );

      const token = response.data.token;

      if (!token) {
        alert("Token not received from backend");
        return;
      }

      localStorage.setItem("token", token);

      alert("Login successful!");

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      handleClose();
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Login failed"
      );

      getCaptcha();
    }
  };
  
 */

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password || !captcha) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        {
          email,
          password,
          captcha,
        },
        {
          withCredentials: true,
        },
      );

      const token = response.data.token;
      const user = response.data.user;

      if (!token || !user) {
        alert("Login details not received from backend");
        return;
      }

      // Save login details
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));

      alert("Login successful!");

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // Redirect according to user role
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "wholesaler") {
        navigate("/wholesaler", { replace: true });
      } else {
        navigate("/profile", { replace: true });
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      alert(error.response?.data?.message || "Login failed");

      getCaptcha();
    }
  };

  // =========================
  // REGISTER
  // =========================
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !registerEmail || !registerPassword || !confirmPassword) {
      alert("Please fill in all required fields");
      return;
    }

    if (registerPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/register",
        {
          name,
          email: registerEmail,
          password: registerPassword,
          phone,
          address,
        },
      );

      alert(response.data.message || "Registration successful!");

      // Clear register form
      setName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");
      setPhone("");
      setAddress("");

      // Put registered email in login
      setEmail(registerEmail);

      // Switch to login
      setActiveTab("login");
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      alert(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div
      className="auth-overlay"
      onClick={(e) => {
        // Close when clicking outside the auth box
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="auth-box">
        {/* Close button */}
        <button
          type="button"
          className="auth-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Logo */}
        <div className="auth-logo">
          Shop<span>Easy</span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={activeTab === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>

          <button
            type="button"
            className={
              activeTab === "register" ? "auth-tab active" : "auth-tab"
            }
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        {/* =========================
            LOGIN
        ========================= */}
        {activeTab === "login" && (
          <div className="auth-form-container">
            <h2>Welcome Back!</h2>

            <p className="auth-subtitle">Login to your account</p>

            <form onSubmit={handleLogin}>
              <div className="auth-input-group">
                <label>Email</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Password</label>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* CAPTCHA */}
              <div className="captcha-group">
                <div className="captcha-box">
                  <span>{captchaImage}</span>
                </div>

                <button
                  type="button"
                  className="captcha-refresh"
                  onClick={getCaptcha}
                >
                  ↻
                </button>

                <input
                  type="text"
                  placeholder="CAPTCHA"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                />
              </div>

              <div className="auth-options">
                <label>
                  <input type="checkbox" />
                  Remember me
                </label>

                <a href="/forgot-password">Forgot Password?</a>
              </div>

              <button type="submit" className="auth-submit">
                Login
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account?
              <button type="button" onClick={() => setActiveTab("register")}>
                Sign Up
              </button>
            </p>
          </div>
        )}

        {/* =========================
            REGISTER
        ========================= */}
        {activeTab === "register" && (
          <div className="auth-form-container">
            <h2>Create Account</h2>

            <p className="auth-subtitle">
              Create your account to start shopping
            </p>

            <form onSubmit={handleRegister}>
              <div className="auth-input-group">
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Email</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Password</label>

                <input
                  type="password"
                  placeholder="Create a password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Confirm Password</label>

                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Phone</label>

                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Address</label>

                <input
                  type="text"
                  placeholder="Enter your address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <label className="terms">
                <input type="checkbox" required />I agree to the Terms &
                Conditions
              </label>

              <button type="submit" className="auth-submit">
                Create Account
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?
              <button type="button" onClick={() => setActiveTab("login")}>
                Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;
