import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((res) => setCourses(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading courses...</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Course Catalog</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {courses.map((c) => (
          <div key={c.id} style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8 }}>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <Link to={`/workspace/${c.id}`}>Open Course Workspace</Link>
          </div>
        ))}
      </div>
    </main>
  );
}