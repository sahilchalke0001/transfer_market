import { useEffect } from "react";
import { SignIn, useUser } from "@clerk/clerk-react";
import loginImg from "../assets/cr7bicycle.png";
import "./SignInPage.css";

const SignInPage = () => {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    console.log(" useEffect called");
    console.log(" isSignedIn:", isSignedIn);
    console.log(" isLoaded:", isLoaded);
    console.log(" user:", user);
  }, [isLoaded, isSignedIn, user]);

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-image">
          <img src={loginImg} alt="Login visual" />
        </div>
        <div className="signin-form">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
