
import { useState, useEffect } from "react";
import axios from "axios";
import "./Login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [loading, setLoading] = useState(false);

  // Get CAPTCHA
  const getCaptcha = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/captcha/captcha",
        {
          withCredentials: true,
        }
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

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password || !captcha) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

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
      const user = response.data.user;

      if (!token || !user) {
        alert("Invalid login response from server");
        return;
      }

      if (!user.role) {
        console.error("USER ROLE MISSING:", user);
        alert("User role not received. Please contact administrator.");
        return;
      }

      // Normalize role
      const role = String(user.role).trim().toLowerCase();

      // Save authentication details
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));

      // Notify Navbar
      window.dispatchEvent(new Event("login"));

      console.log("LOGIN SUCCESS");
      console.log("USER:", user);
      console.log("ROLE:", role);

      alert("Login successful");

      // Redirect based on role
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "wholesaler") {
        navigate("/wholesaler", { replace: true });
      } else {
        navigate("/profile", { replace: true });
      }

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      console.error("SERVER RESPONSE:", error.response?.data);

      alert(
        error.response?.data?.message || "Login failed"
      );

      getCaptcha();

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">

        <div className="logo">
          Shop<span>Easy</span>
        </div>

        <h2>Welcome Back!</h2>

        <p className="subtitle">
          Login to your account
        </p>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
              placeholder="Enter CAPTCHA"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              required
            />

          </div>

          {/* Options */}
          <div className="options">

            <label>
              <input type="checkbox" />
              Remember me
            </label>

            <a href="/auth">
              Forgot Password?
            </a>

          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="signup">
          Don't have an account?
          <br />

          <a href="/register">
            Sign Up
          </a>
        </p>

      </div>
    </div>
  );
}

export default Login;
