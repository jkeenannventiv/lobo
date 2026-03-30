import React, { useEffect, useState } from 'react';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { isRefreshDue, getLastImport, getHomeLocation, getWorkLocation } from '../config/storage';
import {
  getVisitCount,
  getTopActivities,
  getTimeAllocation,
  TimeAllocation,
  getMostRecentVisitTimestamp,
  getLastImportTimestamp,
  getTopCategories,
  getTopPlaces,
  getVisitsByDayOfWeek,
  getVisitsByTimeOfDay,
  getMonthlyVisits,
  getMonthlyDistance,
  getTotalStats,
  getTopPlacesByDuration,
  getFunStats,
  getRecentActivity,
  getNightsAwayFromHome,
  searchPlaces,
  getVisitsForPlace,
  computeSegments,
  Segment,
} from '../config/database';

const TIME_RANGES = [
  { label: '7D', days: 7 },
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

const TOD_COLORS = ['#f5a623', '#e94560', '#1a3a5c', '#555570'];

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
  const [mostRecentDataDate, setMostRecentDataDate] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [placeVisitCount, setPlaceVisitCount] = useState<number>(0);
  const [topActivities, setTopActivities] = useState<{ activity: string; count: number }[]>([]);
  const [topCategories, setTopCategories] = useState<{ category: string; count: number }[]>([]);
  const [topPlaces, setTopPlaces] = useState<{ name: string; count: number; category: string }[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<{ day: string; count: number }[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<{ period: string; count: number }[]>([]);
  const [monthlyVisits, setMonthlyVisits] = useState<{ month: string; count: number }[]>([]);
  const [totalStats, setTotalStats] = useState<{ totalMiles: number; totalVisits: number; totalHoursDriving: number; longestTrip: number; avgMilesPerTrip: number }>({ totalMiles: 0, totalVisits: 0, totalHoursDriving: 0, longestTrip: 0, avgMilesPerTrip: 0 });
  const [monthlyDistance, setMonthlyDistance] = useState<{ month: string; miles: number }[]>([]);
  const [topByDuration, setTopByDuration] = useState<{ name: string; totalMinutes: number; visits: number; avgMinutes: number }[]>([]);
  const [funStats, setFunStats] = useState<{ hoursInCar: number; daysDataSpans: number; uniquePlaces: number; mostVisitedDay: string; mostVisitedTime: string; avgTripsPerWeek: number }>({ hoursInCar: 0, daysDataSpans: 0, uniquePlaces: 0, mostVisitedDay: '', mostVisitedTime: '', avgTripsPerWeek: 0 });
  const [hasData, setHasData] = useState(false);
  const [selectedRange, setSelectedRange] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'stats' | 'history'>('overview');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<{ name: string | null; category: string | null; timestamp: number; duration_minutes: number; activity: string }[]>([]);
  const [nightsAway, setNightsAway] = useState<number>(0);
  const [homeLocationSet, setHomeLocationSet] = useState<boolean>(true);
  const [importTimestamp, setImportTimestamp] = useState<number>(Date.now());
  const [timeAlloc7, setTimeAlloc7] = useState<TimeAllocation | null>(null);
  const [timeAlloc180, setTimeAlloc180] = useState<TimeAllocation | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; category: string; visitCount: number; lastVisit: number; totalMinutes: number }[]>([]);
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [placeVisits, setPlaceVisits] = useState<{ timestamp: number; duration_minutes: number; category: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedRange]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePlaceExpand = async (name: string) => {
    if (expandedPlace === name) {
      setExpandedPlace(null);
      setPlaceVisits([]);
      return;
    }
    setExpandedPlace(name);
    const visits = await getVisitsForPlace(name);
    setPlaceVisits(visits);
  };

  const loadData = async () => {
    const mostRecentTs = await getMostRecentVisitTimestamp();
    const homeLoc = await getHomeLocation();
    const workLoc = await getWorkLocation();
    setHomeLocationSet(homeLoc !== null);
    const due = await isRefreshDue(mostRecentTs);
    const last = await getLastImport();
    const importTs = await getLastImportTimestamp();
    const count = await getVisitCount();
    const days = TIME_RANGES[selectedRange].days;
    const activities = await getTopActivities(days, importTs);
    const categories = await getTopCategories(days, importTs);
    const places = await getTopPlaces(days, importTs);
    const dow = await getVisitsByDayOfWeek(days, importTs);
    const tod = await getVisitsByTimeOfDay(days, importTs);
    const monthly = await getMonthlyVisits(36500);
    const stats = await getTotalStats(days, importTs);
    const distance = await getMonthlyDistance(days, importTs);
    const duration = await getTopPlacesByDuration(days, importTs);
    setImportTimestamp(importTs);

    const [alloc7, alloc180] = await Promise.all([
      getTimeAllocation(days, importTs),
      getTimeAllocation(180, importTs),
    ]);
    setTimeAlloc7(alloc7);
    setTimeAlloc180(alloc180);

    setRefreshDue(due);
    setHasData(count > 0);
    setVisitCount(count);
    setTopActivities(activities);
    setTopCategories(categories);
    setTopPlaces(places);
    setDayOfWeek(dow);
    setTimeOfDay(tod);
    setMonthlyVisits(monthly);
    setTotalStats(stats);
    setMonthlyDistance(distance);
    setTopByDuration(duration);

    const fun = await getFunStats();
    setFunStats(fun);

    const nightsData = await getNightsAwayFromHome(homeLoc?.lat, homeLoc?.lon);
    setNightsAway(nightsData.nightsAway);

    const segs = await computeSegments();
    setSegments(segs);

    const recent = await getRecentActivity(50);
    setRecentActivity(recent);

    const placeVisits = activities.find((a: any) => a.activity === 'Visit');
    setPlaceVisitCount(placeVisits?.count || 0);

    if (last) {
      setLastImport(last.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }));
    }
    if (mostRecentTs > 0) {
      setMostRecentDataDate(new Date(mostRecentTs).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }));
    }
  };

  const totalHours = topActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
  const filteredCategories = topCategories.filter((c: any) => !HIDDEN_CATEGORIES.includes(c.category));
  const filteredPlaces = topPlaces.filter((p: any) => !HIDDEN_CATEGORIES.includes(p.category) && p.category !== null);
  const maxDow = Math.max(...dayOfWeek.map(d => d.count), 1);
  const maxTod = Math.max(...timeOfDay.map(t => t.count), 1);
  const maxMonthly = Math.max(...monthlyVisits.map(m => m.count), 1);

  return (
    <View style={styles.container}>
      <LogoHeader refreshDue={refreshDue} />
      <ScrollView contentContainerStyle={styles.scroll}>


        {hasData ? (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {visitCount.toLocaleString()}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>Records</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {placeVisitCount.toLocaleString()}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>Visits</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {mostRecentDataDate || lastImport || '—'}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>Data Through</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                onPress={() => setActiveTab('overview')}
              >
                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'charts' && styles.tabActive]}
                onPress={() => setActiveTab('charts')}
              >
                <Text style={[styles.tabText, activeTab === 'charts' && styles.tabTextActive]}>Charts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
                onPress={() => setActiveTab('stats')}
              >
                <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                onPress={() => setActiveTab('history')}
              >
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
              </TouchableOpacity>
            </View>

            {!homeLocationSet && hasData && (
              <TouchableOpacity
                style={styles.locationPromptBanner}
                onPress={() => navigation.navigate('LocationSetup', { type: 'home' })}
              >
                <Text style={styles.locationPromptText}>
                  📍 <Text style={{ fontWeight: 'bold' }}>Set your home location</Text> in Settings for more accurate insights
                </Text>
              </TouchableOpacity>
            )}

            {activeTab === 'overview' && (
              <>
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

                {topActivities.length === 0 && hasData && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>No Data in This Period</Text>
                    <Text style={{ color: '#555570', fontSize: 14, lineHeight: 22 }}>
                      No activity found in the last {TIME_RANGES[selectedRange].label === '7D' ? '7 days' : TIME_RANGES[selectedRange].label}. Try selecting a wider time range, or tap <Text style={{ fontWeight: 'bold', color: '#1a3a5c' }}>Refresh Data</Text> to import your latest Timeline.
                    </Text>
                  </View>
                )}

                {topActivities.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Activity Breakdown</Text>
                    <Text style={styles.cardSubtitle}>
                      {TIME_RANGES[selectedRange].label === 'All' ? 'All time' : `Last ${TIME_RANGES[selectedRange].label}`} · hours per activity type
                    </Text>
                    <View style={styles.barChart}>
                      {topActivities.map((item: any, idx: number) => {
                        const pct = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
                        const color = ACTIVITY_COLORS[item.activity] || '#a0aec0';
                        const hrs = item.hours || 0;
                        return (
                          <View key={idx} style={styles.barRow}>
                            <View style={styles.barLabelRow}>
                              <View style={[styles.barDot, { backgroundColor: color }]} />
                              <Text style={styles.barLabel}>
                                {cleanActivityLabel(item.activity)}
                              </Text>
                              <Text style={styles.barPct}>{pct}%</Text>
                              <Text style={styles.barCount}>
                                {hrs.toLocaleString()}h
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

                {timeAlloc7 && timeAlloc7.totalHours > 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Where You Spend Your Time</Text>
                    <Text style={styles.cardSubtitle}>{TIME_RANGES[selectedRange].label === 'All' ? 'All time' : `Last ${TIME_RANGES[selectedRange].label}`} vs 6-month avg</Text>
                    <TimeAllocationChart alloc7={timeAlloc7} alloc180={timeAlloc180} rangeLabel={TIME_RANGES[selectedRange].label} />
                  </View>
                ) : (topActivities.length > 0 && hasData) ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Where You Spend Your Time</Text>
                    <Text style={{ color: '#555570', fontSize: 14, lineHeight: 22 }}>
                      No location data found for this period. Try a wider time range or tap <Text style={{ fontWeight: 'bold', color: '#1a3a5c' }}>Refresh Data</Text>.
                    </Text>
                  </View>
                ) : null}

                {filteredCategories.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Top Place Categories</Text>
                    {filteredCategories.map((item: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.activityRow}
                        onPress={() => setDrillCategory(drillCategory === item.category ? null : item.category)}
                      >
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
                          <Text style={styles.activityCount}>{item.count} visits {drillCategory === item.category ? '▲' : '▼'}</Text>
                        </View>
                        {drillCategory === item.category && (
                          <DrillDown category={item.category} days={TIME_RANGES[selectedRange].days} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {filteredPlaces.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Top Places Visited</Text>
                    {filteredPlaces.map((item: any, idx: number) => (
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


              </>
            )}

            {activeTab === 'charts' && (
              <>
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

                {(!dayOfWeek.some(d => d.count > 0) && !timeOfDay.some(t => t.count > 0)) && hasData && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>No Data in This Period</Text>
                    <Text style={{ color: '#555570', fontSize: 14, lineHeight: 22 }}>
                      No trip data found for the last {TIME_RANGES[selectedRange].label === '7D' ? '7 days' : TIME_RANGES[selectedRange].label}. Try selecting a wider time range, or tap <Text style={{ fontWeight: 'bold', color: '#1a3a5c' }}>Refresh Data</Text> to import your latest Timeline.
                    </Text>
                  </View>
                )}

                {dayOfWeek.length > 0 && dayOfWeek.some(d => d.count > 0) && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Trips by Day of Week</Text>
                    <PieChart
                      data={dayOfWeek.map((item, idx) => ({
                        label: item.day.slice(0, 3),
                        value: item.count,
                        color: `hsl(${210 + idx * 20}, 60%, ${40 + idx * 5}%)`,
                      }))}
                    />
                  </View>
                )}

                {timeOfDay.length > 0 && timeOfDay.some(t => t.count > 0) && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Trips by Time of Day</Text>
                    <PieChart
                      data={timeOfDay.map((item, idx) => ({
                        label: ['Morning', 'Afternoon', 'Evening', 'Night'][idx] || item.period,
                        value: item.count,
                        color: TOD_COLORS[idx],
                      }))}
                    />
                  </View>
                )}

                {monthlyVisits.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Monthly Trip Trend — Last 12 Months</Text>
                    <View style={styles.barChartVertical}>
                      {monthlyVisits.map((item, idx) => (
                        <View key={idx} style={styles.verticalBarCol}>
                          <Text style={styles.verticalBarCount}>{item.count}</Text>
                          <View style={styles.verticalBarTrack}>
                            <View
                              style={[
                                styles.verticalBarFill,
                                {
                                  height: `${Math.round((item.count / maxMonthly) * 100)}%`,
                                  backgroundColor: '#e94560',
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.verticalBarLabel}>{item.month}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {activeTab === 'stats' && (
              <>
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

                {totalStats.totalMiles === 0 && totalStats.totalHoursDriving === 0 && hasData && (
                  <View style={[styles.card, { marginBottom: 16 }]}>
                    <Text style={styles.cardTitle}>No Data in This Period</Text>
                    <Text style={{ color: '#555570', fontSize: 14, lineHeight: 22 }}>
                      No driving data found for this period. Try a wider range or refresh your data.
                    </Text>
                  </View>
                )}

                <View style={styles.statRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                      {totalStats.totalMiles.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel} numberOfLines={1}>Miles</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                      {totalStats.totalHoursDriving.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel} numberOfLines={1}>Hrs Driving</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                      {totalStats.longestTrip > 0 ? `${totalStats.longestTrip}m` : '—'}
                    </Text>
                    <Text style={styles.statLabel} numberOfLines={1}>Longest Trip</Text>
                  </View>
                </View>
                {totalStats.avgMilesPerTrip > 0 && (
                  <View style={[styles.statRow, { marginBottom: 16 }]}>
                    <View style={[styles.statCard, { flex: 1 }]}>
                      <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
                        {totalStats.avgMilesPerTrip.toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel} numberOfLines={1}>Avg Miles / Trip</Text>
                    </View>
                  </View>
                )}

                {monthlyDistance.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Miles Driven by Month</Text>
                    <View style={styles.barChartVertical}>
                      {monthlyDistance.map((item, idx) => {
                        const maxMiles = Math.max(...monthlyDistance.map(d => d.miles), 1);
                        return (
                          <View key={idx} style={styles.verticalBarCol}>
                            <Text style={styles.verticalBarCount}>
                              {item.miles > 999 ? item.miles.toLocaleString() : item.miles}
                            </Text>
                            <View style={styles.verticalBarTrack}>
                              <View
                                style={[
                                  styles.verticalBarFill,
                                  {
                                    height: `${Math.round((item.miles / maxMiles) * 100)}%`,
                                    backgroundColor: '#38a169',
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.verticalBarLabel}>{item.month}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {topByDuration.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Most Time Spent</Text>
                    {topByDuration.map((item, idx) => {
                      const hours = Math.floor(item.totalMinutes / 60);
                      const mins = item.totalMinutes % 60;
                      return (
                        <View key={idx} style={styles.placeRow}>
                          <View style={styles.placeRank}>
                            <Text style={styles.placeRankText}>{idx + 1}</Text>
                          </View>
                          <View style={styles.placeInfo}>
                            <Text style={styles.placeName}>{item.name}</Text>
                            <Text style={styles.placeCategory}>
                              {item.visits} visits · avg {item.avgMinutes}min
                            </Text>
                          </View>
                          <Text style={styles.placeCount}>
                            {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>About You</Text>
                  {funStats.daysDataSpans > 0 && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>📊</Text>
                      <Text style={styles.funStatText}>
                        Your data spans <Text style={styles.funStatHighlight}>{funStats.daysDataSpans} days</Text> of movement history — the stats below cover your full history
                      </Text>
                    </View>
                  )}
                  {funStats.hoursInCar > 0 && funStats.daysDataSpans > 0 && (() => {
                    const yearsSpan = funStats.daysDataSpans / 365;
                    const hrsPerYear = Math.round(funStats.hoursInCar / yearsSpan);
                    const hrsPerDay = (funStats.hoursInCar / funStats.daysDataSpans).toFixed(1);
                    const showPerYear = funStats.daysDataSpans > 60;
                    return (
                      <View style={styles.funStatRow}>
                        <Text style={styles.funStatIcon}>🚗</Text>
                        <Text style={styles.funStatText}>
                          {showPerYear
                            ? <>You average <Text style={styles.funStatHighlight}>{hrsPerYear} hours per year</Text> in your car — about <Text style={styles.funStatHighlight}>{hrsPerDay} hrs/day</Text></>
                            : <>You've spent <Text style={styles.funStatHighlight}>{funStats.hoursInCar.toLocaleString()} hours</Text> in your car</>
                          }
                        </Text>
                      </View>
                    );
                  })()}
                  {funStats.uniquePlaces > 0 && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>📍</Text>
                      <Text style={styles.funStatText}>
                        You've visited <Text style={styles.funStatHighlight}>{funStats.uniquePlaces} unique places</Text> in your history
                      </Text>
                    </View>
                  )}
                  {funStats.mostVisitedDay !== '' && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>📅</Text>
                      <Text style={styles.funStatText}>
                        <Text style={styles.funStatHighlight}>{funStats.mostVisitedDay}</Text> is your most active day for getting out
                      </Text>
                    </View>
                  )}
                  {funStats.mostVisitedTime !== '' && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>⏰</Text>
                      <Text style={styles.funStatText}>
                        Based on your patterns you're a <Text style={styles.funStatHighlight}>{funStats.mostVisitedTime}</Text>
                      </Text>
                    </View>
                  )}
                  {funStats.avgTripsPerWeek > 0 && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>🗺️</Text>
                      <Text style={styles.funStatText}>
                        You average <Text style={styles.funStatHighlight}>{funStats.avgTripsPerWeek} trips per week</Text>
                      </Text>
                    </View>
                  )}
                  {nightsAway > 0 && (
                    <View style={styles.funStatRow}>
                      <Text style={styles.funStatIcon}>🌙</Text>
                      <Text style={styles.funStatText}>
                        You've had <Text style={styles.funStatHighlight}>{nightsAway} night{nightsAway !== 1 ? 's' : ''} away from home</Text>
                        {nightsAway >= 7 ? ` — that's ${Math.floor(nightsAway / 7)} week${Math.floor(nightsAway / 7) !== 1 ? 's' : ''} on the road` : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {segments.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Profile</Text>
                    {segments.map((seg, idx) => {
                      const isYN = seg.level === 'Y' || seg.level === 'N';
                      const levelColor =
                        seg.level === 'H' || seg.level === 'Y' ? '#e94560'
                        : seg.level === 'M' ? '#d69e2e'
                        : seg.level === 'L' || seg.level === 'N' ? '#a0aec0'
                        : '#a0aec0';
                      const levelLabel = isYN
                        ? (seg.level === 'Y' ? 'Yes' : 'No')
                        : seg.level;
                      return (
                        <View key={idx} style={styles.segmentRow}>
                          <Text style={styles.segmentEmoji}>{seg.emoji}</Text>
                          <View style={styles.segmentInfo}>
                            <View style={styles.segmentHeader}>
                              <Text style={styles.segmentLabel}>{seg.label}</Text>
                              <View style={[styles.segmentBadge, { backgroundColor: levelColor }]}>
                                <Text style={styles.segmentBadgeText}>{levelLabel}</Text>
                              </View>
                            </View>
                            <Text style={styles.segmentDesc}>{seg.description}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

              </>
            )}
            {activeTab === 'history' && (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search places..."
                  placeholderTextColor="#aaa"
                  value={searchQuery}
                  onChangeText={text => {
                    setSearchQuery(text);
                    if (expandedPlace) { setExpandedPlace(null); setPlaceVisits([]); }
                  }}
                  clearButtonMode="while-editing"
                  autoCorrect={false}
                />

                {searchQuery.trim().length >= 2 ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Search Results</Text>
                    {searchResults.length === 0 ? (
                      <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 16 }}>
                        No places found matching "{searchQuery}"
                      </Text>
                    ) : (
                      searchResults.map((item, idx) => {
                        const isExpanded = expandedPlace === item.name;
                        const hours = Math.floor(item.totalMinutes / 60);
                        const mins = item.totalMinutes % 60;
                        const totalStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        const lastDate = new Date(item.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <View key={idx}>
                            <TouchableOpacity
                              style={styles.searchResultRow}
                              onPress={() => handlePlaceExpand(item.name)}
                            >
                              <View style={styles.historyInfo}>
                                <Text style={styles.historyName}>{item.name}</Text>
                                <Text style={styles.historyMeta}>
                                  {item.category} · {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''} · {totalStr} total
                                </Text>
                                <Text style={[styles.historyMeta, { marginTop: 2 }]}>Last: {lastDate}</Text>
                              </View>
                              <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                            </TouchableOpacity>
                            {isExpanded && (
                              <View style={styles.placeVisitList}>
                                {placeVisits.map((v, vidx) => {
                                  const vDate = new Date(v.timestamp);
                                  const vh = Math.floor(v.duration_minutes / 60);
                                  const vm = v.duration_minutes % 60;
                                  return (
                                    <View key={vidx} style={styles.placeVisitRow}>
                                      <Text style={styles.placeVisitDate}>
                                        {vDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </Text>
                                      <Text style={styles.placeVisitTime}>
                                        {vDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </Text>
                                      <Text style={styles.placeVisitDuration}>
                                        {vh > 0 ? `${vh}h ${vm}m` : `${vm}m`}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : (
                  recentActivity.length === 0 ? (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Recent Activity</Text>
                      <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 16 }}>
                        No visit history found. Import your Timeline data to see your recent activity.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Recent Visits</Text>
                      {recentActivity.map((item, idx) => {
                        const date = new Date(item.timestamp);
                        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        const hours = Math.floor(item.duration_minutes / 60);
                        const mins = item.duration_minutes % 60;
                        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        return (
                          <View key={idx} style={styles.historyRow}>
                            <View style={styles.historyDate}>
                              <Text style={styles.historyDateText}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                              <Text style={styles.historyTimeText}>{timeStr}</Text>
                            </View>
                            <View style={styles.historyDivider} />
                            <View style={styles.historyInfo}>
                              <Text style={styles.historyName}>{item.name}</Text>
                              <Text style={styles.historyMeta}>
                                {item.category} · {durationStr}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )
                )}
              </>
            )}
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



// ── TimeAllocationChart ───────────────────────────────────────────────────────
const TIME_ALLOC_COLORS = {
  home: '#1a3a5c',
  work: '#e94560',
  transit: '#d69e2e',
  third: '#38a169',
};

const TIME_ALLOC_LABELS = {
  home: '🏠 Home',
  work: '💼 Work/School',
  transit: '🚗 Transit',
  third: '📍 Third Place',
};

function TimeAllocationChart({
  alloc7,
  alloc180,
  rangeLabel = '7D',
}: {
  alloc7: TimeAllocation | null;
  alloc180: TimeAllocation | null;
  rangeLabel?: string;
}) {
  if (!alloc7 || alloc7.totalHours === 0) return null;

  const keys: (keyof typeof TIME_ALLOC_COLORS)[] = ['home', 'work', 'transit', 'third'];

  const getHours = (alloc: TimeAllocation | null, key: string) => {
    if (!alloc) return 0;
    if (key === 'home') return alloc.homeHours;
    if (key === 'work') return alloc.workSchoolHours;
    if (key === 'transit') return alloc.transitHours;
    if (key === 'third') return alloc.thirdPlaceHours;
    return 0;
  };

  const renderBar = (alloc: TimeAllocation | null, label: string) => {
    if (!alloc || alloc.totalHours === 0) return null;
    const total = alloc.homeHours + alloc.workSchoolHours + alloc.transitHours + alloc.thirdPlaceHours;
    return (
      <View style={taStyles.barGroup}>
        <Text style={taStyles.barLabel}>{label}</Text>
        <View style={taStyles.barTrack}>
          {keys.map(key => {
            const hrs = getHours(alloc, key);
            const pct = total > 0 ? (hrs / total) * 100 : 0;
            if (pct < 1) return null;
            return (
              <View
                key={key}
                style={[
                  taStyles.barSegment,
                  { width: `${pct}%`, backgroundColor: TIME_ALLOC_COLORS[key] },
                ]}
              />
            );
          })}
        </View>
        <View style={taStyles.barHours}>
          {keys.map(key => {
            const hrs = getHours(alloc, key);
            const pct = total > 0 ? (hrs / total) * 100 : 0;
            if (pct < 8) return null; // skip label if segment too narrow
            return (
              <Text
                key={key}
                style={[taStyles.barSegmentLabel, { width: `${pct}%`, color: TIME_ALLOC_COLORS[key] }]}
              >
                {hrs}h ({Math.round(pct)}%)
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={taStyles.container}>
      {renderBar(alloc7, `Last ${rangeLabel}`)}
      {alloc180 && alloc180.totalHours > 0 && renderBar(alloc180, '6-month avg')}
      <View style={taStyles.legend}>
        {keys.map(key => (
          <View key={key} style={taStyles.legendItem}>
            <View style={[taStyles.legendDot, { backgroundColor: TIME_ALLOC_COLORS[key] }]} />
            <Text style={taStyles.legendText}>{TIME_ALLOC_LABELS[key]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const taStyles = StyleSheet.create({
  container: {
    gap: 16,
    marginTop: 4,
  },
  barGroup: {
    gap: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555570',
    marginBottom: 2,
  },
  barTrack: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  barSegment: {
    height: 28,
  },
  barHours: {
    flexDirection: 'row',
    marginTop: 2,
  },
  barSegmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#555570',
  },
});

// ── PieChart component ────────────────────────────────────────────────────────
type PieSlice = { label: string; value: number; color: string };

function PieChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const SIZE = 160;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = 64;
  const innerR = 36; // donut hole

  // Build slices
  const slices: { path: string; color: string; midAngle: number; pct: number; label: string }[] = [];
  let startAngle = -Math.PI / 2; // start at 12 o'clock

  for (const slice of data) {
    const pct = slice.value / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    slices.push({ path, color: slice.color, midAngle, pct: Math.round(pct * 100), label: slice.label });
    startAngle = endAngle;
  }

  return (
    <View style={pieStyles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <G>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} stroke="#ffffff" strokeWidth={1.5} />
          ))}
        </G>
      </Svg>
      <View style={pieStyles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={pieStyles.legendRow}>
            <View style={[pieStyles.legendDot, { backgroundColor: s.color }]} />
            <Text style={pieStyles.legendLabel}>{s.label}</Text>
            <Text style={pieStyles.legendPct}>{s.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  legendPct: {
    fontSize: 13,
    color: '#555570',
    fontWeight: '600',
  },
});

function DrillDown({ category, days }: { category: string; days: number }) {
  const [places, setPlaces] = useState<{ name: string; count: number; totalMinutes: number; lastVisit: number }[]>([]);

  useEffect(() => {
    import('../config/database').then(({ getCategoryVisits }) => {
      getCategoryVisits(category, days).then(setPlaces);
    });
  }, [category, days]);

  if (places.length === 0) return (
    <View style={drillStyles.container}>
      <Text style={drillStyles.empty}>No named places found in this category yet. Try refreshing your data to enrich more locations.</Text>
    </View>
  );

  return (
    <View style={drillStyles.container}>
      {places.map((place, idx) => {
        const avgMins = place.totalMinutes > 0 ? Math.round(place.totalMinutes / place.count) : 0;
        const hours = Math.floor(place.totalMinutes / 60);
        const mins = place.totalMinutes % 60;
        return (
          <View key={idx} style={drillStyles.row}>
            <View style={drillStyles.info}>
              <Text style={drillStyles.name}>{place.name}</Text>
              <Text style={drillStyles.detail}>avg {avgMins}min · total {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</Text>
            </View>
            <Text style={drillStyles.count}>{place.count}x</Text>
          </View>
        );
      })}
    </View>
  );
}

const drillStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  detail: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  count: {
    fontSize: 13,
    color: '#1a3a5c',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  empty: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    padding: 8,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    padding: 24,
    paddingTop: 8,
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
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  statNumber: {
    fontSize: 20,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1a3a5c',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555570',
  },
  tabTextActive: {
    color: '#ffffff',
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
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 14,
    fontStyle: 'italic',
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
  barChartVertical: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 4,
  },
  verticalBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  verticalBarCount: {
    fontSize: 9,
    color: '#555570',
    marginBottom: 2,
  },
  verticalBarTrack: {
    width: '100%',
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  verticalBarFill: {
    width: '100%',
    backgroundColor: '#1a3a5c',
    borderRadius: 4,
  },
  verticalBarLabel: {
    fontSize: 10,
    color: '#555570',
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 4,
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
  todRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  todIcon: {
    fontSize: 20,
    width: 28,
  },
  todContent: {
    flex: 1,
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
  funStatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  funStatIcon: {
    fontSize: 20,
    width: 28,
  },
  funStatText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  funStatHighlight: {
    fontWeight: 'bold',
    color: '#1a3a5c',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    gap: 10,
  },
  segmentEmoji: {
    fontSize: 20,
    width: 28,
    marginTop: 1,
  },
  segmentInfo: {
    flex: 1,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  segmentBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  segmentDesc: {
    fontSize: 12,
    color: '#555570',
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  historyDate: {
    width: 48,
    alignItems: 'center',
  },
  historyDateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a3a5c',
    textAlign: 'center',
  },
  historyTimeText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  historyDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#e94560',
    borderRadius: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 12,
    color: '#555570',
  },
  searchInput: {
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a2e',
    marginBottom: 12,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  expandChevron: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  placeVisitList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  placeVisitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  placeVisitDate: {
    fontSize: 12,
    color: '#1a1a2e',
    fontWeight: '500',
    flex: 1,
  },
  placeVisitTime: {
    fontSize: 12,
    color: '#555570',
    width: 75,
    textAlign: 'right',
  },
  placeVisitDuration: {
    fontSize: 12,
    color: '#e94560',
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
});