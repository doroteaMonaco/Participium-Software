import React from "react";
import { Link } from "react-router-dom";
import { Container } from "src/components/shared/Container";
import { Badge } from "src/components/shared/Badge";

export const NotFound: React.FC = () => {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge>404</Badge>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved or doesn't exist.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Go back home
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default NotFound;
