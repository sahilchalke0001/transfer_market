// src/components/SignOutPage.jsx
import { useEffect } from "react";
import { SignOutButton } from "@clerk/clerk-react";
import logoutImg from "../assets/2.jpg";
import "./SignOutPage.css";

const SignOutPage = () => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="signout-page">
      <div className="signout-container">
        <div className="signout-form">
          <div className="logout-box">
            <h1>Ready to leave?</h1>
            <SignOutButton>
              <button className="logout-button">Sign Out</button>
            </SignOutButton>
          </div>
        </div>
        <div className="signout-image">
          <img src={logoutImg} alt="Logout visual" />
        </div>
      </div>
    </div>
  );
};

export default SignOutPage;
