import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Footer from "../components/Footer";
import TemplatesSection from "../components/5_Profile/ProfileBottom/Templates/TemplatesSection";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import readDoc from "../../backend/helper/firebase/readDoc";
import { canViewerAccessProfile } from "../utils/workoutPrivacy";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { withStrongPress } from "../utils/haptics";

const formatCount = (value) => {
    const num = Number.isFinite(value) ? value : Number(value) || 0;
    const safe = num < 0 ? 0 : num;
    return `${safe} ${safe === 1 ? 'Template' : 'Templates'}`;
};

const LockedView = ({ subtitle }) => (
    <View style={styles.lockedContainer}>
        <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed" size={scaleSize(42)} color="#A5B4FC" />
        </View>
        <Text style={styles.lockedTitle}>This account is private</Text>
        <Text style={styles.lockedSubtitle}>
            {subtitle || 'Follow to view templates from this profile.'}
        </Text>
    </View>
);

export default function ProfileTemplatesScreen({ navigation, route }) {
    const params = route?.params || {};
    const initialUser = params?.initialUser || null;
    const passedUid = params?.targetUid || initialUser?.uid || '';
    const targetUid = passedUid ? String(passedUid) : '';
    const isViewingSelf = !!params?.isViewingSelf;

    const [userData, setUserData] = useState(() => (initialUser && initialUser.uid ? initialUser : null));
    const [isUserLoading, setIsUserLoading] = useState(!initialUser);

    useFocusEffect(
        useCallback(() => {
            clearFooterSuppression();
            return undefined;
        }, [])
    );

    useEffect(() => {
        if (!targetUid) return;
        let cancelled = false;
        setIsUserLoading(true);
        readDoc('users', targetUid)
            .then((doc) => {
                if (cancelled) return;
                if (doc && doc.uid) setUserData(doc);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setIsUserLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [targetUid]);

    useEffect(() => {
        if (!isViewingSelf) return undefined;
        try {
            const { subscribeUserData } = require('../utils/userDataEvents');
            const unsubscribe = subscribeUserData((nextUser) => {
                if (nextUser && nextUser.uid) setUserData(nextUser);
            });
            return unsubscribe;
        } catch {
            return undefined;
        }
    }, [isViewingSelf]);

    const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const canViewContent = canViewerAccessProfile(userData, viewerUid, viewerData);

    const templates = useMemo(() => (
        !userData || !canViewContent
            ? []
            : (Array.isArray(userData?.templates) ? userData.templates : [])
    ), [userData, canViewContent]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const headerSubtitle = useMemo(() => {
        if (!userData) return '';
        if (userData.handle) return `@${userData.handle}`;
        if (userData.name) return userData.name;
        return '';
    }, [userData?.handle, userData?.name]);

    let mainContent = null;
    if (!targetUid) {
        mainContent = (
            <View style={styles.errorContainer}>
                <Text style={styles.emptyTitle}>Profile unavailable</Text>
                <Text style={styles.emptySubtitle}>We could not determine which profile to load.</Text>
            </View>
        );
    } else if (!userData && isUserLoading) {
        mainContent = (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#93C5FD" />
            </View>
        );
    } else if (!canViewContent) {
        const lockedSubtitle = userData?.settings?.profilePrivate ? 'Only approved followers can view these templates.' : '';
        mainContent = <LockedView subtitle={lockedSubtitle} />;
    } else {
        mainContent = (
            <View style={styles.templatesWrap}>
                <TemplatesSection
                    templates={templates}
                    isVisible
                    isBottomSheetExpanded
                    viewingSelf={isViewingSelf}
                />
            </View>
        );
    }

    const templateCount = templates.length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.contentWrap}>
                <View style={styles.headerContainer}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={withStrongPress(handleBack)} style={styles.headerBackButton} hitSlop={8}>
                            <Ionicons name="chevron-back" size={scaleSize(22)} color={theme.textPrimary} />
                        </Pressable>
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.headerTitle}>Templates</Text>
                            {headerSubtitle ? (
                                <Text style={styles.headerSubtitle} numberOfLines={1}>{headerSubtitle}</Text>
                            ) : null}
                        </View>
                        <View style={styles.headerRightSpacer} />
                    </View>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Templates</Text>
                        <Text style={styles.countLabel}>{formatCount(templateCount)}</Text>
                    </View>
                </View>
                {mainContent}
            </View>

            <Footer currentScreenName={'Profile'} navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    contentWrap: {
        flex: 1,
        paddingHorizontal: scaleSize(14),
        paddingBottom: scaleSize(16),
    },
    headerContainer: {
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(12),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(12),
    },
    headerBackButton: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    headerTitleWrap: {
        flex: 1,
        marginHorizontal: scaleSize(10),
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(18),
        color: '#F1F5FF',
    },
    headerSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
    },
    headerRightSpacer: {
        width: scaleSize(34),
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15),
        color: '#E8F0FF',
    },
    countLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
        color: '#93A4C5',
    },
    templatesWrap: {
        flex: 1,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    emptyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#E3E9FF',
        marginBottom: scaleSize(4),
    },
    emptySubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: '#9CA3AF',
        textAlign: 'center',
    },
    lockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    lockedIconWrap: {
        width: scaleSize(78),
        height: scaleSize(78),
        borderRadius: scaleSize(39),
        backgroundColor: 'rgba(99, 102, 241, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(14),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16.5),
        color: '#E5E9FF',
        marginBottom: scaleSize(6),
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        lineHeight: scaleSize(19),
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
