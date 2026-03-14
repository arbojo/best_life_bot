import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { LucideTruck, LucidePackage, LucideMapPin, LucideNavigation } from 'lucide-react-native';

const MOCK_ORDERS = [
  { id: '1', title: 'Order #MTY-00124', address: 'Av. Siempre Viva 123, Col. Centro', status: 'Pending' },
  { id: '2', title: 'Order #MTY-00125', address: 'Calle Falsa 456, Col. Ebanos', status: 'Pending' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, Juan Carlos</Text>
          <Text style={styles.status}>Tienes 2 entregas pendientes</Text>
        </View>
        <TouchableOpacity style={styles.statusBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.statusBadgeText}>En Turno</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <LucideTruck size={24} color="#6366f1" />
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Entregas Hoy</Text>
        </View>
        <View style={styles.statBox}>
          <LucidePackage size={24} color="#6366f1" />
          <Text style={styles.statValue}>12km</Text>
          <Text style={styles.statLabel}>Recorridos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Rutas Asignadas</Text>

      <FlatList
        data={MOCK_ORDERS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View style={styles.orderIdContainer}>
                <LucidePackage size={16} color="#94a3b8" />
                <Text style={styles.orderId}>{item.title}</Text>
              </View>
              <Text style={styles.orderStatus}>{item.status}</Text>
            </View>
            
            <View style={styles.addressContainer}>
              <LucideMapPin size={18} color="#6366f1" />
              <Text style={styles.address}>{item.address}</Text>
            </View>

            <TouchableOpacity style={styles.navButton}>
              <LucideNavigation size={18} color="#ffffff" />
              <Text style={styles.navButtonText}>Iniciar Ruta</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  status: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderStatus: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  address: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  navButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  navButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
