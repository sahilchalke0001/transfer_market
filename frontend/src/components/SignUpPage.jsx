import { useEffect } from "react";
import { SignUp, useUser, useAuth } from "@clerk/clerk-react";
import loginImg from "../assets/cr7bicycle.png";
import "./SignInPage.css";

const SignUpPage = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Send user data to backend once they sign up and Clerk is ready
  useEffect(() => {
    const sendUserData = async () => {
      if (!user || !isSignedIn || !isLoaded) return;

      const userData = {
        clerkUserId: user.id,
        fullName: user.fullName || user.username || "N/A",
        email: user.primaryEmailAddress?.emailAddress || "",
      };

      try {
        const response = await fetch("http://localhost:5000/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        const result = await response.json();
        if (response.ok) {
          console.log("✅ User data saved:", result.user);
        } else {
          console.error("❌ Error saving user:", result.message);
        }
      } catch (error) {
        console.error("❌ Network error:", error);
      }
    };

    sendUserData();
  }, [user, isSignedIn, isLoaded, getToken]);

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-image">
          <img src={loginImg} alt="Sign up visual" />
        </div>
        <div className="signin-form">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
