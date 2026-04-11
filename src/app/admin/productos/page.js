
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase'; // <-- CORREGIDO
import { collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

const ProductosPage = () => {
  const { userRole } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const productosCollection = collection(db, 'products'); // <-- CORREGIDO
        const productosSnapshot = await getDocs(productosCollection);
        const productosData = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductos(productosData);
      } catch (error) {
        console.error("Error al obtener los productos: ", error);
      }
      setLoading(false);
    };

    if (userRole === 'admin') {
      fetchProductos();
    }
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">No tienes permiso para ver esta página.</p>
      </div>
    );
  }

  if (loading) {
    return <p>Cargando productos...</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin">
          <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
            <FaArrowLeft className="mr-2" />
            Volver al Panel Principal
          </span>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Productos</h1>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Añadir Producto
        </button>
      </div>
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map(producto => (
              <tr key={producto.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{producto.nombre}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">${producto.precio}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{producto.stock}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button className="text-indigo-600 hover:text-indigo-900">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductosPage;
