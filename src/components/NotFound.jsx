// components/NotFound.jsx
export default function NotFound() {
  return (
    <div className="min-h-screen overflow-hidden flex justify-center items-center">
        <div className="flex flex-col items-center justify-center text-center text-gray-600">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-lg">The page you’re looking for doesn’t exist.</p>
        </div>
    </div>
  );
}
