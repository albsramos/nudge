import { createBrowserRouter } from 'react-router';
import { HomePage } from './HomePage/HomePage';

// One route; the rest (search, opened note) lives in the query string, so GitHub Pages never 404s.
export const router = createBrowserRouter([{ path: '*', element: <HomePage /> }], { basename: import.meta.env.BASE_URL });
