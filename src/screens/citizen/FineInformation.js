import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

const FINE_DATA = [
    {
        id: 1,
        offense: "Permit without authorization / vehicle other than 2–3 wheelers / without helmet",
        section: "Sec: 129/177 MV Act",
        fine: "1st time Rs. 1,000 & then Rs. 2,000"
    },
    {
        id: 2,
        offense: "Excess passengers – 2 (Owner or person in authorized possession of the vehicle)",
        section: "Sec: 194A MV Act – (Extra 2)",
        fine: "Rs. 400"
    },
    {
        id: 3,
        offense: "Driver & Motor vehicle which makes use of a other than prescribed glasses are released",
        section: "Sec: 194F (B) MV Act",
        fine: "1st time Rs. 1,000 & then Rs. 2,000"
    },
    {
        id: 4,
        offense: "Sounding the horn in an area with a traffic sign prohibiting use of it",
        section: "Sec: 194F (G) MV Act",
        fine: "1st time Rs. 1,000 & then Rs. 2,000"
    },
    {
        id: 5,
        offense: "Unsafe goods beyond body / No white reflector disc & additional Red lamp attached at the rear",
        section: "MVMR 222(2)/177 MV Act",
        fine: "Rs. 2,000"
    },
    {
        id: 6,
        offense: "Custody of Motor Vehicle without consent of Owner / Removal of Vehicle without legal authority",
        section: "Sec: 197 MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 7,
        offense: "Not slowing down at Junction and Zebra Crossing",
        section: "MVDR 9/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 8,
        offense: "Excess number of persons sitting in cabin of goods carriage",
        section: "MMVR 23(1)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 9,
        offense: "Overtaking obstructed",
        section: "MVDR 14(9)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 10,
        offense: "No use of mobile phone by trainer while training learner driver",
        section: "MVDR 37(2) /177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 11,
        offense: "Misbehaviour towards passenger & others (PSV other than AC)",
        section: "MMVR 20(3)(ii)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 12,
        offense: "Unnecessarily delay the journey (PSV other than AC)",
        section: "MMVR 20(3)(iii)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 13,
        offense: "Motor Vehicle with left hand drive without displaying mechanical or signaling device board at the rear side (owner & driver both)",
        section: "Sec: 120/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 14,
        offense: "Failure to display Badge (HMV passenger)",
        section: "MMVR 24(2)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 15,
        offense: "Form No. 19 duplicate copy not produced",
        section: "CMVR 43/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 16,
        offense: "Turning for/near vehicle at round about from normal side",
        section: "MVDR 11(3)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 17,
        offense: "Driving slowly without good and sufficient reason to interfere normal traffic flow",
        section: "MVDR 16(3)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 18,
        offense: "Applying brakes or stopping without genuine reason",
        section: "MVDR 18/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 19,
        offense: "Parking the vehicle opposite another MV or as obstacle to other vehicle",
        section: "MVDR 22(3)(a)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 20,
        offense: "No Parking",
        section: "MVDR 22(2)(s)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 21,
        offense: "Refusal to ply taxi / bus or to carry passenger",
        section: "Sec: 178(3) MV Act",
        fine: "Rs. 200"
    },
    {
        id: 22,
        offense: "Using word / figure / drawing / sticker on vehicle (Minister/Police/Politician/Advocate / press address etc.)",
        section: "MMVR 31A/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 23,
        offense: "Excess passenger 1 (Owner or person in authorized possession of the Vehicle)",
        section: "Sec: 194A MV Act – (Extra 1)",
        fine: "Rs. 200"
    },
    {
        id: 24,
        offense: "Excess passengers 2 (Driver)",
        section: "Sec: 194A MV Act – (Extra 2)",
        fine: "Rs. 400"
    },
    {
        id: 25,
        offense: "Not stopping before stop line",
        section: "MMVR 23(7)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 26,
        offense: "Dangerous driving",
        section: "Sec: 184 MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 27,
        offense: "Excess passengers 7 (Owner or person in authorized possession of the vehicle)",
        section: "Sec: 194A MV Act – (Extra 7)",
        fine: "Rs. 1,400"
    },
    {
        id: 28,
        offense: "Excess passengers 8 (Driver)",
        section: "Sec: 194A MV Act – (Extra 8)",
        fine: "Rs. 1,600"
    },
    {
        id: 29,
        offense: "Parking the vehicle in a tunnel",
        section: "MVDR 22(2)(g)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 30,
        offense: "Parking the vehicle in bus lane",
        section: "MVDR 22(2)(h)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 31,
        offense: "Parking the vehicle in front of entrance or exit of property",
        section: "MVDR 22(2)(i)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 32,
        offense: "Parking the vehicle obstructing other vehicle or cause inconvenience to any person",
        section: "MVDR 22(2)(m)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 33,
        offense: "Parked vehicle in other than permitted specified category",
        section: "MVDR 22(2)(c)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 34,
        offense: "No Parking Vehicle as designated in parking lot",
        section: "MVDR 22(2)(f)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 35,
        offense: "Stopping Vehicle on Pedestrian Crossing",
        section: "MVDR 22(2)(w)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 36,
        offense: "Causing danger / obstructions or undue inconvenience to others by allowing the vehicle to be towed or pushed from a public place or parking area",
        section: "Sec: 127/177 MV Act",
        fine: "Rs. 1,000"
    },
    {
        id: 37,
        offense: "Not providing way for emergency vehicles (Fire service / Ambulance & any other emergency vehicle specified by State govt.)",
        section: "Sec: 194E MV Act",
        fine: "Rs. 10,000"
    },
    {
        id: 38,
        offense: "Driving the vehicle by a person who is disqualified for holding or obtaining driving license",
        section: "Sec: 182(1) MV Act",
        fine: "Rs. 10,000"
    },
    {
        id: 39,
        offense: "Driving without DL",
        section: "Sec: 3/181 MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 40,
        offense: "Driving backwards/in reverse direction on road/in a parking/any other public place",
        section: "MMVR 23(3)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 41,
        offense: "Parking the vehicle on footpath / cycle track & zebra crossing",
        section: "MVDR 22(2)(j)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 42,
        offense: "Child up to 14 years age not provided seat with appropriate child restraint system (Driver)",
        section: "Sec: 194B(2) MV Act",
        fine: "Rs. 1,000"
    },
    {
        id: 43,
        offense: "Child up to 14 years age not provided seat with appropriate child restraint system (Owner or person in authorized possession of the Vehicle)",
        section: "Sec: 194B(1) MV Act",
        fine: "Rs. 1,000"
    },
    {
        id: 44,
        offense: "Without valid fitness certificate (Driver)",
        section: "Sec: 56/39/192 MV Act",
        fine: "1st time Rs. 2,000 & then Rs. 5,000"
    },
    {
        id: 45,
        offense: "Without valid fitness certificate (Owner)",
        section: "Sec: 56/39/192 MV Act",
        fine: "1st time Rs. 2,000 & then Rs. 5,000"
    },
    {
        id: 46,
        offense: "Unclean vehicle (Motor Cab)",
        section: "MMVR 21(9)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 47,
        offense: "Driving vehicle with parking light on",
        section: "CMVR 109/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 48,
        offense: "Number Plate Broken",
        section: "CMVR 50/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 49,
        offense: "Number Plate of Transport Vehicle Not Displayed at Four Places",
        section: "CMVR 50/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 50,
        offense: "Identification card issued by Dealer not produced",
        section: "CMVR 44/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 51,
        offense: "Original T.C. Not produced",
        section: "CMVR 39(2)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 52,
        offense: "Speed violating by driver (MMV – HMV)",
        section: "Sec: 112/183(1) MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 53,
        offense: "Driving old defective motor vehicle",
        section: "Sec: 190(1) MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 54,
        offense: "Carrying Hazardous or Dangerous Goods without adherence to the MV Act and CMVR Provision",
        section: "Sec: 190(3) MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 55,
        offense: "Wrong side driving",
        section: "MVDR 3/122/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 56,
        offense: "Lane cutting",
        section: "MVDR 6/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 57,
        offense: "Use of multi-coloured red & blue flash light shall be permitted only on Vehicles specified specially for emergency duties and shall be designated specified by State Government",
        section: "CMVR 108(4)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 58,
        offense: "Parking the vehicle where stopping prohibited / vehicle abandoned on road",
        section: "MVDR 22(2)(a)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 59,
        offense: "Restrictions to carry unpacked dangerous substances/explosive/highly inflammable substances on public service vehicle",
        section: "MMVR 23(7)/177 MV Act",
        fine: "1st time Rs. 500 & then Rs. 1,500"
    },
    {
        id: 60,
        offense: "NO PARKING (Camping)",
        section: "MVDR 22(2)(s)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 61,
        offense: "Stopping the vehicle at mandatory \"NO STOPPING\" sign",
        section: "MVDR 22(2)(o)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 62,
        offense: "Parking/Stopping vehicle in a tunnel without genuine reason",
        section: "MVDR 20 (3)/177A MV Act",
        fine: "Will be sent to court"
    },
    {
        id: 63,
        offense: "Riding without helmet (2/3 wheeler)",
        section: "Sec: 129/177 MV Act",
        fine: "Rs. 1,000 & then Rs. 2,000"
    },
    {
        id: 64,
        offense: "Overspeeding",
        section: "Sec: 183(1) MV Act",
        fine: "Rs. 1,000 & then Rs. 2,000"
    },
    {
        id: 65,
        offense: "Driving by a minor",
        section: "Sec: 199A MV Act",
        fine: "Rs. 25,000"
    },
    {
        id: 66,
        offense: "Drunk driving",
        section: "Sec: 185 MV Act",
        fine: "Rs. 10,000"
    },
    {
        id: 67,
        offense: "Rash driving",
        section: "Sec: 184 MV Act",
        fine: "Will be sent to court"
    }
];

export default function FineInformation({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState(FINE_DATA);

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredData(FINE_DATA);
        } else {
            const filtered = FINE_DATA.filter(item =>
                item.offense.toLowerCase().includes(text.toLowerCase()) ||
                item.section.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredData(filtered);
        }
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Fine Amount</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Hero Graphic */}
                <View style={styles.heroContainer}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1549317336-206569e8475c?auto=format&fit=crop&w=800&q=80' }} style={styles.heroImage} />
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroText}>Official Penalty Data</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by offense or section..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Fine List */}
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {filteredData.map((item) => (
                        <View key={item.id} style={styles.fineCard}>
                            <View style={styles.fineHeader}>
                                <View style={styles.fineIconContainer}>
                                    <Ionicons name="alert-circle" size={24} color={COLORS.primary} />
                                </View>
                            </View>

                            <Text style={styles.offense}>{item.offense}</Text>

                            <View style={styles.detailRow}>
                                <Ionicons name="document-text" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.section}>{item.section}</Text>
                            </View>

                            <View style={styles.fineAmountContainer}>
                                <Ionicons name="cash" size={16} color={COLORS.success} />
                                <Text style={styles.fineAmount}>{item.fine}</Text>
                            </View>
                        </View>
                    ))}

                    {filteredData.length === 0 && (
                        <View style={styles.noResultsContainer}>
                            <Ionicons name="search" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.noResultsText}>No results found</Text>
                            <Text style={styles.noResultsSubtext}>
                                Try searching with different keywords
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    heroContainer: {
        height: 140,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    heroText: {
        color: COLORS.white,
        fontWeight: FONT_WEIGHTS.bold,
        fontSize: FONT_SIZES.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        ...SHADOWS.sm,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        padding: 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
        paddingTop: SPACING.md,
    },
    fineCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    fineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    fineIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    offense: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        lineHeight: 22,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    section: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
        fontWeight: FONT_WEIGHTS.medium,
    },
    fineAmountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
    },
    fineAmount: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.success,
        marginLeft: SPACING.xs,
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xxl * 2,
    },
    noResultsText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    noResultsSubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
    },
});

