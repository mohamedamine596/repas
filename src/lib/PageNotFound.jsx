import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Heart, Home } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#1B5E3B]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-[#1B5E3B]" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">404</h1>
        <p className="text-gray-500 mb-8">
          Cette page n'existe pas, mais votre solidarité, si !
        </p>
        <Link to={createPageUrl("Home")}>
          <Button className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl h-11 px-6">
            <Home className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}