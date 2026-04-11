import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, Globe, Leaf, Shield, ArrowRight } from "lucide-react";
import AppLogo from "../components/AppLogo";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b033390db1712a51a56d65/4d38fd5d2_generated_image.png";

const values = [
  { icon: Heart, title: "Solidarité", desc: "Nous croyons que chaque geste de générosité compte et peut changer une vie." },
  { icon: Users, title: "Entraide", desc: "Mettre en relation citoyens donneurs et personnes dans le besoin, simplement." },
  { icon: Leaf, title: "Anti-gaspillage", desc: "Réduire le gaspillage alimentaire tout en aidant ceux qui en ont besoin." },
  { icon: Shield, title: "Confiance", desc: "Une plateforme sécurisée avec un système de signalement pour la communauté." },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-24 md:pb-10">
      {/* Hero block */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <img
            src={LOGO_URL}
            alt="Logo Repas Solidaire"
            className="w-24 h-24 rounded-2xl object-cover shadow-lg"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">À propos de nous</h1>
        <p className="text-[#1B5E3B] font-semibold text-lg">
          Une initiative de l'association Solidarité Sans Frontières
        </p>
        <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
          Repas Solidaire est une plateforme solidaire de partage de nourriture, 
          créée pour rapprocher ceux qui donnent et ceux qui ont besoin.
        </p>
      </div>

      {/* About the association */}
      <Card className="border-[#f0e8df] overflow-hidden">
        <div className="bg-[#1B5E3B] px-6 py-4">
          <h2 className="text-white font-bold text-lg">Solidarité Sans Frontières</h2>
          <p className="text-white/70 text-sm">Association loi 1901 — France</p>
        </div>
        <CardContent className="p-6 space-y-4 text-gray-600 leading-relaxed">
          <p>
            <strong className="text-gray-800">Solidarité Sans Frontières</strong> est une organisation 
            engagée pour l'entraide, la solidarité et le soutien aux personnes dans le besoin. 
            Fondée sur les valeurs de partage et de fraternité, l'association œuvre chaque jour 
            pour un monde plus juste et plus humain.
          </p>
          <p>
            L'objectif de l'application <strong className="text-[#1B5E3B]">Repas Solidaire</strong> est 
            de faciliter le partage de nourriture entre citoyens afin de <strong className="text-gray-800">réduire 
            le gaspillage alimentaire</strong> et d'<strong className="text-gray-800">aider les personnes en 
            difficulté</strong>.
          </p>
          <p>
            Grâce à la géolocalisation, chaque annonce est visible par les personnes proches, 
            permettant une récupération rapide et efficace des repas encore consommables.
          </p>
        </CardContent>
      </Card>

      {/* Values */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">Nos valeurs</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {values.map((v) => (
            <Card key={v.title} className="border-[#f0e8df]">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1B5E3B]/10 flex items-center justify-center flex-shrink-0">
                  <v.icon className="w-5 h-5 text-[#1B5E3B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{v.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{v.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="bg-[#FFF8F0] rounded-2xl border border-[#f0e8df] p-6 md:p-8 text-center space-y-4">
        <Globe className="w-10 h-10 text-[#E8634A] mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Notre mission</h2>
        <p className="text-gray-500 leading-relaxed max-w-lg mx-auto">
          Créer un lien humain et solidaire entre les personnes qui ont trop et celles qui ont besoin, 
          grâce à une technologie simple et accessible à tous.
        </p>
        <Link to={createPageUrl("MealsList")}>
          <Button className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl mt-2">
            Voir les repas disponibles
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Footer info */}
      <div className="text-center text-sm text-gray-400 space-y-1 pb-4">
        <p className="font-medium text-gray-500">Association Solidarité Sans Frontières</p>
        <p>France</p>
        <p>Plateforme solidaire de partage de repas.</p>
      </div>
    </div>
  );
}