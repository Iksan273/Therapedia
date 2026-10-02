import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/app/layout/AppLayout";
import { RequireAccess, RequireModule } from "@/app/router/guards";
import { groupModules, PROTECTED_GROUPS, PUBLIC_ROUTES, STANDALONE_ROUTES } from "@/app/router/routes";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const RouteFallback = () => (
  <div className="max-w-6xl mx-auto p-4 sm:p-8">
    <PageSkeleton variant="table" />
  </div>
);

// Router dibangun dari konfigurasi di routes.js. Tambah halaman baru di sana, bukan di sini.
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {PUBLIC_ROUTES.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}

          {STANDALONE_ROUTES.map(({ path, roles, modules, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireAccess roles={roles} modules={modules}>
                  <Component />
                </RequireAccess>
              }
            />
          ))}

          {PROTECTED_GROUPS.map((group) => (
            <Route
              key={group.path}
              path={group.path}
              element={
                <RequireAccess roles={group.roles} modules={groupModules(group)}>
                  <AppLayout />
                </RequireAccess>
              }
            >
              {group.children.map(({ index, path, redirect, Component, module }) => {
                const element = redirect ? (
                  <Navigate to={redirect} replace />
                ) : (
                  <RequireModule module={module}>
                    <Component />
                  </RequireModule>
                );
                return index ? (
                  <Route key="index" index element={element} />
                ) : (
                  <Route key={path} path={path} element={element} />
                );
              })}
            </Route>
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
