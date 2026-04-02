import { Suspense } from "react";
import PetCardClient from "./PetCardClient";

export default function PetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading...</div>}>
      <PetCardClient />
    </Suspense>
  );
}
