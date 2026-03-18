import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { isRefreshDue, getLastImport } from '../config/storage';
import { getVisitCount, getTopActivities, getTopCategories, getTopPlaces } from '../config/database';
const TIME_RANGES = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 36500 },
];

const ACTIVITY_COLORS: Record<string, string> = {
  Visit: '#e94560',
  Driving: '#1a3a5c',
  Walking: '#38a169',
  Cycling: '#805ad5',
  Train: '#d69e2e',
  Subway: '#3182ce',
  Bus: '#dd6b20',
  Running: '#e53e3e',
  Stationary: '#718096',
  Unknown: '#a0aec0',
  UNKNOWN_ACTIVITY_TYPE: '#a0aec0',
};

function cleanActivityLabel(activity: string): string {
  const map: Record<string, string> = {
    UNKNOWN_ACTIVITY_TYPE: 'Unknown',
    Visit: 'Visit',
    Driving: 'Driving',
    Walking: 'Walking',
    Running: 'Running',
    Cycling: 'Cycling',
    Train: 'Train',
    Subway: 'Subway',
    Bus: 'Bus',
    Stationary: 'Stationary',
    Unknown: 'Unknown',
  };
  return map[activity] || activity;
}

const HIDDEN_CATEGORIES = ['Road', 'Unknown', 'Business', 'Point of Interest'];

export default function HomeScreen({ navigation, route }: any) {
  const [refreshDue, setRefreshDue] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [placeVisitCount, setPlaceVisitCount] = useState<number>(0);
  const [topActivities, setTopActivities] = useState<{ activity: string; count: number }[]>([]);
  const [topCategories, setTopCategories] = useState<{ category: string; count: number }[]>([]);
  const [topPlaces, setTopPlaces] = useState<{ name: string; count: number; category: string }[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedRange, setSelectedRange] = useState(3);

  useEffect(() => {
    loadData();
  }, [route.params, selectedRange]);

  const loadData = async () => {
    const due = await isRefreshDue();
    const last = await getLastImport();
    const count = await getVisitCount();
    const days = TIME_RANGES[selectedRange].days;
    const activities = await getTopActivities();
    const categories = await getTopCategories(days);
    const places = await getTopPlaces(days);
    
    setRefreshDue(due);
    setHasData(count > 0);
    setVisitCount(count);
    setTopActivities(activities);
    setTopCategories(categories);
    setTopPlaces(places);

    const placeVisits = activities.find(a => a.activity === 'Visit');
    setPlaceVisitCount(placeVisits?.count || 0);

    if (last) {
      setLastImport(last.toLocaleDateString());
    }
  };

  const total = topActivities.reduce((sum, a) => sum + a.count, 0);
  const filteredCategories = topCategories.filter(c => !HIDDEN_CATEGORIES.includes(c.category));
  const filteredPlaces = topPlaces.filter(p => !HIDDEN_CATEGORIES.includes(p.category) && p.category !== null);

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>

        {refreshDue && (
          <TouchableOpacity
            style={styles.refreshBanner}
            onPress={() => navigation.navigate('ExportGuide')}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
            <View style={styles.refreshText}>
              <Text style={styles.refreshTitle}>Time to refresh your data!</Text>
              <Text style={styles.refreshSubtitle}>
                Your Timeline data is over 30 days old. Tap here to update it.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {hasData ? (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{visitCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Records</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{placeVisitCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Place Visits</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{lastImport || '—'}</Text>
                <Text style={styles.statLabel}>Last Import</Text>
              </View>
            </View>

            <View style={styles.timeRange}>
              {TIME_RANGES.map((range, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.timeRangeButton,
                    selectedRange === idx && styles.timeRangeActive,
                  ]}
                  onPress={() => setSelectedRange(idx)}
                >
                  <Text style={[
                    styles.timeRangeText,
                    selectedRange === idx && styles.timeRangeTextActive,
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {topActivities.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Activity Breakdown</Text>
                <View style={styles.barChart}>
                  {topActivities.map((item, idx) => {
                    const pct = Math.round((item.count / total) * 100);
                    const color = ACTIVITY_COLORS[item.activity] || '#a0aec0';
                    return (
                      <View key={idx} style={styles.barRow}>
                        <View style={styles.barLabelRow}>
                          <View style={[styles.barDot, { backgroundColor: color }]} />
                          <Text style={styles.barLabel}>
                            {cleanActivityLabel(item.activity)}
                          </Text>
                          <Text style={styles.barPct}>{pct}%</Text>
                          <Text style={styles.barCount}>
                            {item.count.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${pct}%`, backgroundColor: color },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {filteredCategories.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Place Categories</Text>
                {filteredCategories.map((item, idx) => (
                  <View key={idx} style={styles.activityRow}>
                    <View style={styles.activityBar}>
                      <View
                        style={[
                          styles.activityFill,
                          {
                            width: `${Math.round(
                              (item.count / filteredCategories[0].count) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.activityLabel}>
                      <Text style={styles.activityName}>{item.category}</Text>
                      <Text style={styles.activityCount}>{item.count} visits</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {filteredPlaces.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Places Visited</Text>
                {filteredPlaces.map((item, idx) => (
                  <View key={idx} style={styles.placeRow}>
                    <View style={styles.placeRank}>
                      <Text style={styles.placeRankText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{item.name}</Text>
                      {item.category && item.category !== 'Business' && item.category !== 'Point of Interest' && (
                        <Text style={styles.placeCategory}>{item.category}</Text>
                      )}
                    </View>
                    <Text style={styles.placeCount}>{item.count}x</Text>
                  </View>
                ))}
              </View>
            )}

            

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('ExportGuide')}
            >
              <Text style={styles.secondaryButtonText}>🔄 Refresh Data</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeTitle}>Welcome to Lobo!</Text>
              <Text style={styles.welcomeText}>
                Your account is set up. Now let's import your Timeline data
                to start building your personal dashboards.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What you'll see here</Text>
              <Text style={styles.cardItem}>📍  Top places you visit</Text>
              <Text style={styles.cardItem}>🍔  Fast food & restaurant habits</Text>
              <Text style={styles.cardItem}>🚗  Distance traveled by month</Text>
              <Text style={styles.cardItem}>🛒  Retail & grocery patterns</Text>
              <Text style={styles.cardItem}>⛽  Gas station visits</Text>
              <Text style={styles.cardItem}>💊  Pharmacy trips</Text>
              <Text style={styles.cardItem}>🏋️  Gym & fitness visits</Text>
              <Text style={styles.cardItem}>✈️  Travel & air trips</Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ExportGuide')}
            >
              <Text style={styles.buttonText}>Import Timeline File</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8ee',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f5a623',
    gap: 12,
  },
  refreshIcon: {
    fontSize: 28,
  },
  refreshText: {
    flex: 1,
  },
  refreshTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  refreshSubtitle: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a3a5c',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#a8c4e0',
    textAlign: 'center',
  },
  timeRange: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeRangeActive: {
    backgroundColor: '#1a3a5c',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555570',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a5c',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  barChart: {
    gap: 12,
  },
  barRow: {
    marginBottom: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  barDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  barPct: {
    fontSize: 12,
    color: '#555570',
    marginRight: 4,
  },
  barCount: {
    fontSize: 12,
    color: '#555570',
    minWidth: 50,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  activityRow: {
    marginBottom: 16,
  },
  activityBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  activityFill: {
    height: 8,
    backgroundColor: '#1a3a5c',
    borderRadius: 4,
  },
  activityLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityName: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  activityCount: {
    fontSize: 13,
    color: '#555570',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  placeRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a3a5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeRankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  placeCategory: {
    fontSize: 12,
    color: '#555570',
  },
  placeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a3a5c',
  },
  tipCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f5a623',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f5a623',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 22,
  },
  welcomeBanner: {
    backgroundColor: '#1a3a5c',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#a8c4e0',
    lineHeight: 22,
  },
  cardItem: {
    fontSize: 14,
    color: '#555570',
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  secondaryButtonText: {
    color: '#555570',
    fontSize: 16,
  },
});