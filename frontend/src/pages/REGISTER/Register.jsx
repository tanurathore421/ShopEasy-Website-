
import { useState } from "react";
import axios from "axios";
import "./Register.css";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    // Required fields
    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword ||
      !phone.trim()
    ) {
      alert("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email.trim())) {
      alert("Please enter a valid email address");
      return;
    }

    // Phone validation (Indian 10-digit mobile number)
    const phonePattern = /^[6-9]\d{9}$/;

    if (!phonePattern.test(phone)) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    // Password validation
    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/register",
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          phone,
          address: address.trim()
        }
      );

      alert(response.data.message || "Registration successful!");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPhone("");
      setAddress("");

      navigate("/login");

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="register-page">
      <div className="register-box">

        <div className="register-logo">
          Shop<span>Easy</span>
        </div>

        <h2>Create Account</h2>

        <p className="register-subtitle">
          Create your account to start shopping
        </p>

        <form onSubmit={handleRegister}>

          <div className="register-input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="register-input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="register-input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password (minimum 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="register-input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="register-input-group">
            <label>Phone</label>
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              required
            />
          </div>

          <div className="register-input-group">
            <label>Address</label>
            <input
              type="text"
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <label className="terms">
            <input type="checkbox" required />
            I agree to the Terms & Conditions
          </label>

          <button type="submit">Create Account</button>

        </form>

        <p className="login-link">
          Already have an account?
          <a href="/login"> Login</a>
        </p>

      </div>
    </div>
  );
}

export default Register;



/* import  { useState } from "react";
import axios from "axios";
import "./Register.css";
import { useNavigate } from "react-router-dom";

function Register() {

   const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const handleRegister = async(e) => {
    e.preventDefault();

    if (name === "" || email === "" || password === "" || confirmPassword === "") {
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // connect to backend api
    try{
      const response= await axios.post(
        "http://localhost:3000/api/auth/register",
        {
          name,
          email,
          password,
          phone,
          address
        }
      );

      alert(response.data.message || "Registration successful!");

            navigate("/login");

      //clear input fields
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPhone("");
      setAddress("");

    }catch(error){
      alert(error.response.data.message || "Registration failed");
    }
  
  };

  return (
    <div className="register-page">
      <div className="register-box">

        <div className="register-logo">
          Shop<span>Easy</span>
        </div>

        <h2>Create Account</h2>
        <p className="register-subtitle">
          Create your account to start shopping
        </p>

        <form onSubmit={handleRegister}>

          <div className="register-input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="register-input-group">
            <label>Email</label>
            <input
              type="email"
          
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="register-input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

            

          <div className="register-input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <div className="register-input-group">
            <label>Phone</label>
            <input
              type="number"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          
          <div className="register-input-group">
            <label>Address</label>
            <input
              type="text"
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

       

          <label className="terms">
            <input type="checkbox" required />
            I agree to the Terms & Conditions
          </label>

          <button type="submit">Create Account</button>

        </form>

        <p className="login-link">
          Already have an account?
          <a href="/login"> Login</a>
        </p>

      </div>
    </div>
  );
}

export default Register; */