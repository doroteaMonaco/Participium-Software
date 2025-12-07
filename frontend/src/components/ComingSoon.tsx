import React from "react";
import { useNavigate } from "react-router-dom";
import { Container } from "src/components/shared/Container";
import { Badge } from "src/components/shared/Badge";
import { Construction } from "lucide-react";

export const ComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge>Coming Soon</Badge>
          <div className="mt-6 flex justify-center">
            <div className="rounded-full bg-indigo-50 p-4">
              <Construction className="h-10 w-10 text-indigo-600" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Work in progress
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            This page is currently under construction. We're working hard to
            bring you this feature soon!
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Go back
            </button>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default ComingSoon;
