import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import Layout from "./components/Layout.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import StoryPage from "./pages/StoryPage.jsx";
import ChapterPage from "./pages/ChapterPage.jsx";
import AdminRoot from "./admin/AdminRoot.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import LoginPage from "./admin/LoginPage.jsx";
import DashboardPage from "./admin/DashboardPage.jsx";
import StoryEditorPage from "./admin/StoryEditorPage.jsx";
import { EditChapterPage, NewChapterPage } from "./admin/ChapterEditorPage.jsx";
import ImportPage from "./admin/ImportPage.jsx";
import CommentsPage from "./admin/CommentsPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: "stories/:slug", element: <StoryPage /> },
      { path: "stories/:slug/chapters/:number", element: <ChapterPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminRoot />,
    children: [
      { path: "login", element: <LoginPage /> },
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "stories/:id", element: <StoryEditorPage /> },
          {
            path: "stories/:storyId/chapters/new",
            element: <NewChapterPage />,
          },
          { path: "chapters/:id", element: <EditChapterPage /> },
          { path: "stories/:storyId/import", element: <ImportPage /> },
          { path: "comments", element: <CommentsPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
